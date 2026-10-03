import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { defaultExtensionMap, toSSG } from "hono/ssg";
import {
  type ConfigEnv,
  createServer,
  type Plugin,
  type ResolvedConfig,
} from "vite";
import { collectSiteOwnedOutputPaths } from "./content_assets.js";

type ToSsgOptions = NonNullable<Parameters<typeof toSSG>[2]>;

type GeneratedOutputAsset = {
  type: "asset";
  fileName: string;
  source: string | Uint8Array;
};

type SsgGeneratedHtmlDiagnostic = {
  severity: "info" | "warning" | "error";
  message: string;
  code?: string;
  filePath?: string;
};

type SsgHtmlInspectorPlugin = {
  name?: string;
  inspectGeneratedHtml?: (page: {
    path: string;
    html: string;
  }) => readonly SsgGeneratedHtmlDiagnostic[];
};

type SsgModule = {
  default: Parameters<typeof toSSG>[0];
  content?: {
    getManifest(): Promise<{
      generatedOutputs?: readonly {
        path: string;
        content: string | Uint8Array;
      }[];
    }>;
    getOutputChangeSet(): Promise<{
      affected: readonly { kind: string; path: string }[];
      removed: readonly { kind: string; path: string }[];
      unchanged: readonly { kind: string; path: string }[];
      fullRegenerationRequired: boolean;
      candidateOutputCount: number;
      affectedOutputCount: number;
      removedOutputCount: number;
      unchangedOutputCount: number;
    }>;
  };
  config?: {
    plugins?: readonly SsgHtmlInspectorPlugin[];
  };
};

type SsgOutputChangeSet =
  NonNullable<SsgModule["content"]> extends {
    getOutputChangeSet(): Promise<infer T>;
  }
    ? T
    : never;

type SsgOutputMetrics = {
  candidateOutputCount: number;
  affectedOutputCount: number;
  removedOutputCount: number;
  unchangedOutputCount: number;
  renderedOutputCount: number;
  emittedOutputCount: number;
  reusedOutputCount: number;
  deletedOutputCount: number;
  shadowedOutputCount: number;
  fullRegenerationRequired: boolean;
  htmlOutputCount: number;
  assetOutputCount: number;
  cacheFileSizeBytes: number | null;
  cacheEntriesRead: number;
  cacheEntriesSerialized: number;
  enumeratedRouteCount: number;
  renderedRouteCount: number;
  skippedRouteCount: number;
  timingsMs: Record<string, number>;
};

type OutputCacheEntry = {
  source: string;
  encoding: "utf8" | "base64";
};

type OutputCacheState = {
  version: 1;
  appFingerprint?: string;
  outputs: Record<string, OutputCacheEntry>;
};

export type RiebeckiteSsgOptions = {
  entry?: string;
  plugins?: ToSsgOptions["plugins"];
  extensionMap?: Record<string, string>;
};

const defaultEntry = "./src/index.tsx";
const cloudflareWorkerAssetLimit = 25 * 1024 * 1024;

export function riebeckiteSsg(options: RiebeckiteSsgOptions = {}): Plugin {
  const virtualId = "virtual:riebeckite-ssg-void-entry";
  const resolvedVirtualId = `\0${virtualId}`;
  const entry = options.entry ?? defaultEntry;
  let resolvedConfig: ResolvedConfig | undefined;

  return {
    name: "riebeckite-ssg",
    apply: shouldApplyRiebeckiteSsg,
    enforce: "post",
    config() {
      return {
        build: {
          rollupOptions: {
            input: [virtualId],
          },
        },
      };
    },
    configResolved(config) {
      resolvedConfig = config;
    },
    resolveId(id) {
      return id === virtualId ? resolvedVirtualId : undefined;
    },
    load(id) {
      return id === resolvedVirtualId
        ? 'console.log("suppress empty chunk message")'
        : undefined;
    },
    async generateBundle(_outputOptions, bundle) {
      const config = resolvedConfig;
      if (!config) {
        throw new Error(
          "Riebeckite SSG could not resolve the Vite configuration.",
        );
      }

      const timingsMs: Record<string, number> = {};
      removeVirtualEntryChunk(bundle, resolvedVirtualId);
      const server = await measure(timingsMs, "ssgSetup", () =>
        createServer({
          root: config.root,
          define: config.define,
          resolve: {
            ...config.resolve,
            builtins: [...config.resolve.builtins, /^node:/],
          },
          plugins: [],
          build: { ssr: true },
          mode: config.mode,
        }),
      );

      try {
        const module = (await measure(timingsMs, "ssrModuleLoad", () =>
          server.ssrLoadModule(entry),
        )) as SsgModule;
        const app = module.default;
        if (!app) {
          throw new Error(`Failed to find a default export from ${entry}.`);
        }

        const outputChangeSet = await measure<SsgOutputChangeSet | undefined>(
          timingsMs,
          "outputDependencyResolution",
          async () => module.content?.getOutputChangeSet(),
        );
        const appFingerprint = await measure(timingsMs, "appFingerprint", () =>
          computeAppFingerprint(config.root, config.configFile),
        );
        const outputCachePath = join(
          config.root,
          ".riebeckite",
          "ssg-output-cache.json",
        );
        const previousOutputCache = await loadOutputCache(
          outputCachePath,
          timingsMs,
          (message) => this.warn(message),
        );
        const siteOwnedOutputPaths = await measure(
          timingsMs,
          "siteOwnedOutputs",
          () => collectSiteOwnedOutputPaths(config.publicDir),
        );
        const canUseIncremental =
          outputChangeSet &&
          !outputChangeSet.fullRegenerationRequired &&
          previousOutputCache &&
          previousOutputCache.appFingerprint === appFingerprint &&
          outputChangeSet.unchanged.every(
            (output) =>
              siteOwnedOutputPaths.has(output.path) ||
              previousOutputCache.outputs[output.path],
          );
        const reusablePaths = new Set<string>(
          canUseIncremental
            ? outputChangeSet.unchanged.map((output) => output.path)
            : [],
        );
        const shadowedOutputs = new Set<string>();
        const skippedRouteCount = canUseIncremental
          ? outputChangeSet.unchanged.filter(
              (output) => output.kind !== "generated",
            ).length
          : 0;
        const generatedHtml: { path: string; html: string }[] = [];
        const nextOutputCache: OutputCacheState = {
          version: 1,
          appFingerprint,
          outputs: {},
        };
        const metrics: SsgOutputMetrics = {
          candidateOutputCount: outputChangeSet?.candidateOutputCount ?? 0,
          affectedOutputCount: outputChangeSet?.affectedOutputCount ?? 0,
          removedOutputCount: outputChangeSet?.removedOutputCount ?? 0,
          unchangedOutputCount: outputChangeSet?.unchangedOutputCount ?? 0,
          renderedOutputCount: 0,
          emittedOutputCount: 0,
          reusedOutputCount: 0,
          deletedOutputCount: 0,
          shadowedOutputCount: 0,
          fullRegenerationRequired: !canUseIncremental,
          htmlOutputCount: 0,
          assetOutputCount: 0,
          cacheFileSizeBytes: previousOutputCache?.fileSizeBytes ?? null,
          cacheEntriesRead: previousOutputCache
            ? Object.keys(previousOutputCache.outputs).length
            : 0,
          cacheEntriesSerialized: 0,
          enumeratedRouteCount: 0,
          renderedRouteCount: 0,
          skippedRouteCount,
          timingsMs,
        };
        process.env.RIEBECKITE_SSG_FULL_REGENERATION = canUseIncremental
          ? ""
          : "1";
        const outDir = resolve(config.root, config.build.outDir);
        const result = await measure(timingsMs, "toSSG", () =>
          toSSG(
            app,
            {
              writeFile: async (filePath, data) => {
                const fileName = relative(outDir, filePath).replaceAll(
                  "\\",
                  "/",
                );
                metrics.enumeratedRouteCount += 1;
                if (siteOwnedOutputPaths.has(fileName)) {
                  shadowedOutputs.add(fileName);
                  return;
                }
                if (canUseIncremental && reusablePaths.has(fileName)) {
                  return;
                }
                if (fileName.endsWith(".html") && typeof data === "string") {
                  metrics.renderedOutputCount += 1;
                  metrics.htmlOutputCount += 1;
                  generatedHtml.push({ path: fileName, html: data });
                } else {
                  metrics.assetOutputCount += 1;
                }
                this.emitFile({
                  type: "asset",
                  fileName,
                  source: data,
                });
                metrics.emittedOutputCount += 1;
                nextOutputCache.outputs[fileName] = encodeOutput(data);
              },
              async mkdir() {},
            },
            {
              dir: outDir,
              plugins: [...(options.plugins ?? [])],
              extensionMap: options.extensionMap ?? defaultExtensionMap,
            },
          ),
        );
        delete process.env.RIEBECKITE_SSG_FULL_REGENERATION;
        metrics.renderedRouteCount = result.files.length;
        if (!result.success) throw result.error;

        const emittedGeneratedOutputCount = await measure(
          timingsMs,
          "generatedOutputs",
          () =>
            emitGeneratedOutputs(
              module,
              (asset) => {
                this.emitFile(asset);
                metrics.emittedOutputCount += 1;
                nextOutputCache.outputs[asset.fileName] = encodeOutput(
                  asset.source,
                );
              },
              canUseIncremental
                ? new Set(
                    outputChangeSet.affected
                      .filter((output) => output.kind === "generated")
                      .map((output) => output.path),
                  )
                : undefined,
              siteOwnedOutputPaths,
              (path) => shadowedOutputs.add(path),
            ),
        );
        if (!outputChangeSet)
          metrics.candidateOutputCount =
            result.files.length + emittedGeneratedOutputCount;
        if (canUseIncremental) {
          await measure(timingsMs, "unchangedOutputReuse", async () => {
            for (const output of outputChangeSet.unchanged) {
              const path = output.path;
              if (siteOwnedOutputPaths.has(path)) {
                shadowedOutputs.add(path);
                continue;
              }
              const cached = previousOutputCache.outputs[path];
              if (!cached) continue;
              this.emitFile({
                type: "asset",
                fileName: path,
                source: decodeOutput(cached),
              });
              metrics.emittedOutputCount += 1;
              metrics.reusedOutputCount += 1;
              nextOutputCache.outputs[path] = cached;
            }
          });
        }
        if (outputChangeSet) {
          for (const output of outputChangeSet.removed) {
            if (siteOwnedOutputPaths.has(output.path)) continue;
            await rm(join(outDir, output.path), {
              force: true,
            });
            metrics.deletedOutputCount += 1;
          }
        }
        metrics.shadowedOutputCount = shadowedOutputs.size;
        if (shadowedOutputs.size > 0) {
          this.warn(
            `Site public assets take precedence over generated outputs: ${[
              ...shadowedOutputs,
            ]
              .sort()
              .join(", ")}`,
          );
        }
        metrics.cacheEntriesSerialized = Object.keys(
          nextOutputCache.outputs,
        ).length;
        try {
          await saveOutputCache(outputCachePath, nextOutputCache, timingsMs);
        } catch (error) {
          this.warn(
            `SSG output cache could not be saved; the next build regenerates every output. ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
        await writeSsgOutputMetrics(metrics);
        inspectGeneratedHtmlPages(module, generatedHtml, {
          warn: (message) => this.warn(message),
          info: (message) => this.info(message),
        });
      } finally {
        await server.close();
      }
    },
    async closeBundle() {
      if (!resolvedConfig) return;

      const outDir = resolve(resolvedConfig.root, resolvedConfig.build.outDir);
      const oversizedAssets = await findOversizedAssets(outDir);
      for (const asset of oversizedAssets) {
        this.warn(
          `Generated asset ${asset.path} is ${formatBytes(asset.size)}, exceeding Cloudflare Workers' ${formatBytes(cloudflareWorkerAssetLimit)} asset limit.`,
        );
      }
    },
  };
}

async function findOversizedAssets(
  directory: string,
  relativeDirectory = "",
): Promise<{ path: string; size: number }[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    (error: unknown) => {
      if (isMissingDirectoryError(error)) return [];
      throw error;
    },
  );
  const nestedAssets = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      const relativePath = join(relativeDirectory, entry.name).replaceAll(
        "\\",
        "/",
      );
      if (entry.isDirectory()) {
        return findOversizedAssets(path, relativePath);
      }
      if (!entry.isFile()) return [];

      const size = (await stat(path)).size;
      return size > cloudflareWorkerAssetLimit
        ? [{ path: relativePath, size }]
        : [];
    }),
  );
  return nestedAssets.flat();
}

function isMissingDirectoryError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export function shouldApplyRiebeckiteSsg(
  _config: unknown,
  env: ConfigEnv,
): boolean {
  return env.command === "build" && env.mode !== "client";
}

/**
 * Forwards plugin-generated files (registered through the Core output sink)
 * into the Vite build output. Plugins never write to disk themselves.
 */
async function emitGeneratedOutputs(
  module: SsgModule,
  emit: (asset: GeneratedOutputAsset) => void,
  affectedPaths?: ReadonlySet<string>,
  shadowedPaths?: ReadonlySet<string>,
  onShadowed?: (path: string) => void,
): Promise<number> {
  const content = module.content;
  if (!content) return 0;

  const manifest = await content.getManifest();
  let count = 0;
  for (const output of manifest.generatedOutputs ?? []) {
    if (affectedPaths && !affectedPaths.has(output.path)) continue;
    if (shadowedPaths?.has(output.path)) {
      onShadowed?.(output.path);
      continue;
    }
    emit({
      type: "asset",
      fileName: output.path,
      source: output.content,
    });
    count += 1;
  }
  return count;
}

const APP_FINGERPRINT_IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".riebeckite",
  "dist",
]);

const APP_FINGERPRINT_CONFIG_FILES = [
  "riebeckite.config.ts",
  "riebeckite.config.mts",
  "riebeckite.config.cts",
  "riebeckite.config.js",
  "riebeckite.config.mjs",
  "riebeckite.config.cjs",
];

async function computeAppFingerprint(
  root: string,
  configFile: string | undefined,
): Promise<string> {
  const files: string[] = [];
  await collectAppFiles(join(root, "app"), files);
  if (configFile) files.push(configFile);
  for (const name of APP_FINGERPRINT_CONFIG_FILES) {
    files.push(join(root, name));
  }
  files.sort();
  const hash = createHash("sha256");
  for (const file of files) {
    let content: Buffer;
    try {
      content = await readFile(file);
    } catch {
      continue;
    }
    hash.update(relative(root, file).replaceAll("\\", "/"));
    hash.update("\0");
    hash.update(content);
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function collectAppFiles(
  directory: string,
  files: string[],
): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    () => undefined,
  );
  if (!entries) return;
  for (const entry of entries) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (APP_FINGERPRINT_IGNORED_DIRECTORIES.has(entry.name)) continue;
      await collectAppFiles(full, files);
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
}

export async function loadOutputCache(
  path: string,
  timingsMs?: Record<string, number>,
  log: (message: string) => void = () => {},
): Promise<(OutputCacheState & { fileSizeBytes?: number }) | undefined> {
  let raw: string;
  try {
    raw = await measure(timingsMs, "outputCacheRead", () =>
      readFile(path, "utf8"),
    );
  } catch (error) {
    if (isNotFoundError(error)) return undefined;
    log(
      `SSG output cache could not be read; the build regenerates every output. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = measureSync(timingsMs, "outputCacheParse", () => JSON.parse(raw));
  } catch (error) {
    log(
      `SSG output cache is corrupted and will be rebuilt. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return undefined;
  }

  if (!isOutputCacheState(parsed)) {
    log("SSG output cache uses an unsupported format and will be rebuilt.");
    return undefined;
  }
  return timingsMs
    ? { ...parsed, fileSizeBytes: Buffer.byteLength(raw) }
    : parsed;
}

function isOutputCacheState(value: unknown): value is OutputCacheState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as {
    version?: unknown;
    appFingerprint?: unknown;
    outputs?: unknown;
  };
  return (
    candidate.version === 1 &&
    (candidate.appFingerprint === undefined ||
      typeof candidate.appFingerprint === "string") &&
    isOutputCacheEntries(candidate.outputs)
  );
}

function isOutputCacheEntries(
  value: unknown,
): value is OutputCacheState["outputs"] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as OutputCacheEntry).source === "string" &&
      ((entry as OutputCacheEntry).encoding === "utf8" ||
        (entry as OutputCacheEntry).encoding === "base64"),
  );
}

export async function saveOutputCache(
  path: string,
  state: OutputCacheState,
  timingsMs?: Record<string, number>,
): Promise<void> {
  const directory = dirname(path);
  await mkdir(directory, { recursive: true });
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  const serialized = measureSync(
    timingsMs,
    "outputCacheSerialize",
    () => `${JSON.stringify(state)}\n`,
  );

  try {
    await measure(timingsMs, "outputCacheWrite", () =>
      writeFile(temporaryPath, serialized, "utf8"),
    );
    await measure(timingsMs, "outputCacheRename", () =>
      replaceFile(temporaryPath, path),
    );
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function replaceFile(
  temporaryPath: string,
  targetPath: string,
): Promise<void> {
  try {
    await rename(temporaryPath, targetPath);
  } catch (error) {
    if (!isReplacementFailure(error)) throw error;
    await rm(targetPath, { force: true });
    await rename(temporaryPath, targetPath);
  }
}

function isReplacementFailure(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  const code = String(error.code);
  return code === "EPERM" || code === "EEXIST" || code === "EACCES";
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function encodeOutput(source: string | Uint8Array): OutputCacheEntry {
  return typeof source === "string"
    ? { source, encoding: "utf8" }
    : { source: Buffer.from(source).toString("base64"), encoding: "base64" };
}

function decodeOutput(entry: OutputCacheEntry): string | Uint8Array {
  return entry.encoding === "utf8"
    ? entry.source
    : Buffer.from(entry.source, "base64");
}

async function writeSsgOutputMetrics(metrics: SsgOutputMetrics): Promise<void> {
  const file = process.env.RIEBECKITE_SSG_METRICS_FILE;
  if (!file) return;
  await writeFile(file, `${JSON.stringify(metrics)}\n`, "utf8");
}

async function measure<T>(
  timingsMs: Record<string, number> | undefined,
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    if (timingsMs)
      timingsMs[name] = (timingsMs[name] ?? 0) + performance.now() - start;
  }
}

function measureSync<T>(
  timingsMs: Record<string, number> | undefined,
  name: string,
  fn: () => T,
): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    if (timingsMs)
      timingsMs[name] = (timingsMs[name] ?? 0) + performance.now() - start;
  }
}

/**
 * Runs post-SSG HTML inspections contributed by Core plugins. Structural rules
 * that need the whole document (a11y, duplicate ids, anchors) cannot see the
 * final page during the Core lifecycle, so `@riebeckite/honox` forwards every
 * emitted HTML file to plugins that declare `inspectGeneratedHtml`.
 */
function inspectGeneratedHtmlPages(
  module: SsgModule,
  pages: readonly { path: string; html: string }[],
  log: { warn: (message: string) => void; info: (message: string) => void },
): void {
  const plugins = module.config?.plugins ?? [];
  for (const plugin of plugins) {
    const inspector = plugin.inspectGeneratedHtml;
    if (typeof inspector !== "function") continue;

    for (const page of pages) {
      for (const diagnostic of inspector(page) ?? []) {
        const label = `[${plugin.name ?? "plugin"}] ${page.path}: ${diagnostic.message}`;
        if (diagnostic.severity === "info") log.info(label);
        else log.warn(label);
      }
    }
  }
}

function removeVirtualEntryChunk(
  bundle: Record<
    string,
    { type: string; fileName: string; moduleIds?: string[] }
  >,
  virtualEntryId: string,
): void {
  for (const chunk of Object.values(bundle)) {
    if (chunk.type === "chunk" && chunk.moduleIds?.includes(virtualEntryId)) {
      delete bundle[chunk.fileName];
    }
  }
}
