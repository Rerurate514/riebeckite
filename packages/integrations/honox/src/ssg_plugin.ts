import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
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
import { defaultExtensionMap, redirectPlugin, toSSG } from "hono/ssg";
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
    getProcessedContentCount(): number;
    getReusedContentCount(): number;
    getManifestHookMetrics(): {
      manifestHooksExecuted: number;
      manifestHooksReused: number;
      manifestHookCacheHit: number;
      manifestHookCacheMiss: number;
      manifestHookDurationMs: number;
      byPlugin: Record<
        string,
        {
          executed: number;
          reused: number;
          cacheHit: number;
          cacheMiss: number;
          durationMs: number;
          reason: string;
        }
      >;
    };
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
  processedContentCount: number;
  reusedContentCount: number;
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
  manifestHooksExecuted: number;
  manifestHooksReused: number;
  manifestHookCacheHit: number;
  manifestHookCacheMiss: number;
  manifestHookDurationMs: number;
  manifestHookPlugins: Record<string, unknown>;
  timingsMs: Record<string, number>;
};

type OutputCacheEntry = {
  source: string;
  encoding: "utf8" | "base64";
  checksum: string;
};

type OutputCacheState = {
  version: 3;
  appFingerprint?: string;
  clientManifestFingerprint?: string;
  outputs: Record<string, OutputCacheEntry>;
  finalOutputInventory?: Record<string, string>;
  publicDirectory?: string;
  publicFingerprint?: string;
  configFile?: string;
};

type FastPathCacheState = {
  version: 1;
  outputCacheChecksum: string;
  appFingerprint?: string;
  finalOutputInventory: Record<string, string>;
  publicDirectory?: string;
  publicFingerprint?: string;
  configFile: string;
  outputPaths: readonly string[];
};

type ClientBuildArtifacts = {
  stagingDirectory: string;
  paths: readonly string[];
  manifestFingerprint: string;
};

export type NoChangeFastPathResult = {
  readonly used: boolean;
  readonly blockReason?: string;
};

export type NoChangeFastPathOutputMetrics = {
  outputInventoryValidationDurationMs: number;
  outputHashValidationDurationMs: number;
  outputFilesHashed: number;
  outputBytesHashed: number;
};

export function createNoChangeFastPathOutputMetrics(): NoChangeFastPathOutputMetrics {
  return {
    outputInventoryValidationDurationMs: 0,
    outputHashValidationDurationMs: 0,
    outputFilesHashed: 0,
    outputBytesHashed: 0,
  };
}

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
  let pendingOutputCache:
    | {
        path: string;
        state: OutputCacheState;
        outDir: string;
        publicDir: string | false | undefined;
        configFile: string | undefined;
      }
    | undefined;
  let clientBuildArtifacts: ClientBuildArtifacts | undefined;

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
    async buildStart() {
      const config = resolvedConfig;
      if (!config) return;
      if (
        !config.plugins.some((plugin) =>
          plugin.name.startsWith("@hono/vite-build/"),
        )
      ) {
        return;
      }
      const outDir = resolve(config.root, config.build.outDir);
      clientBuildArtifacts = await preserveClientBuildArtifacts(outDir);
      logSsgDiagnostics(
        this,
        `client manifest ${clientBuildArtifacts ? `preserved (${clientBuildArtifacts.paths.length} files)` : "not found"}`,
      );
      await rm(outDir, {
        recursive: true,
        force: true,
      });
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
      const outDir = resolve(config.root, config.build.outDir);
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
          environments: {
            ssr: { resolve: { noExternal: [/^honox(?:\/.*)?$/] } },
          },
          mode: config.mode,
          server: { watch: null },
        }),
      );

      try {
        await restoreClientBuildArtifacts(outDir, clientBuildArtifacts);
        logSsgDiagnostics(
          this,
          `SSR noExternal=${formatSsrNoExternal()} · client manifest ${clientBuildArtifacts ? "restored" : "not found"}`,
        );
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
        const siteOutputCollisions = findBuildOutputSiteCollisions(
          Object.keys(bundle),
          siteOwnedOutputPaths,
        );
        if (siteOutputCollisions.length > 0) {
          this.warn(
            `Build outputs take precedence over site public assets: ${siteOutputCollisions.join(", ")}`,
          );
        }
        const canUseIncremental =
          outputChangeSet &&
          !outputChangeSet.fullRegenerationRequired &&
          previousOutputCache &&
          previousOutputCache.appFingerprint === appFingerprint &&
          previousOutputCache.clientManifestFingerprint ===
            clientBuildArtifacts?.manifestFingerprint &&
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
        logSsgDiagnostics(
          this,
          `output cache ${canUseIncremental ? "hit" : "miss"} · ${reusablePaths.size} reusable outputs`,
        );
        const shadowedOutputs = new Set<string>();
        const skippedRouteCount = canUseIncremental
          ? outputChangeSet.unchanged.filter(
              (output) => output.kind !== "generated",
            ).length
          : 0;
        const generatedHtml: { path: string; html: string }[] = [];
        const nextOutputCache: OutputCacheState = {
          version: 3,
          appFingerprint,
          clientManifestFingerprint: clientBuildArtifacts?.manifestFingerprint,
          outputs: {},
          configFile: config.configFile,
        };
        const metrics: SsgOutputMetrics = {
          processedContentCount: 0,
          reusedContentCount: 0,
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
          manifestHooksExecuted: 0,
          manifestHooksReused: 0,
          manifestHookCacheHit: 0,
          manifestHookCacheMiss: 0,
          manifestHookDurationMs: 0,
          manifestHookPlugins: {},
          timingsMs,
        };
        process.env.RIEBECKITE_SSG_FULL_REGENERATION = canUseIncremental
          ? ""
          : "1";
        process.env.RIEBECKITE_SSG_SKIP_UNCHANGED = canUseIncremental
          ? "1"
          : "";
        const result = await measure(timingsMs, "toSSG", () =>
          toSSG(
            app,
            {
              writeFile: async (filePath, data) => {
                const fileName = relative(outDir, filePath).replaceAll(
                  "\\",
                  "/",
                );
                if (siteOwnedOutputPaths.has(fileName)) {
                  shadowedOutputs.add(fileName);
                  return;
                }
                if (canUseIncremental && reusablePaths.has(fileName)) {
                  return;
                }
                if (fileName.endsWith(".html") && typeof data === "string") {
                  metrics.renderedOutputCount += 1;
                  metrics.renderedRouteCount += 1;
                  metrics.htmlOutputCount += 1;
                  generatedHtml.push({ path: fileName, html: data });
                } else {
                  metrics.assetOutputCount += 1;
                }
                measureSync(timingsMs, "outputWrite", () =>
                  this.emitFile({
                    type: "asset",
                    fileName,
                    source: data,
                  }),
                );
                metrics.emittedOutputCount += 1;
                nextOutputCache.outputs[fileName] = encodeOutput(data);
              },
              async mkdir() {},
            },
            {
              dir: outDir,
              plugins: [redirectPlugin(), ...(options.plugins ?? [])],
              extensionMap: options.extensionMap ?? defaultExtensionMap,
            },
          ),
        );
        delete process.env.RIEBECKITE_SSG_FULL_REGENERATION;
        delete process.env.RIEBECKITE_SSG_SKIP_UNCHANGED;
        metrics.enumeratedRouteCount = result.files.length;
        if (!result.success) throw result.error;
        metrics.processedContentCount =
          module.content?.getProcessedContentCount() ?? 0;
        metrics.reusedContentCount =
          module.content?.getReusedContentCount() ?? 0;
        const manifestHookMetrics = module.content?.getManifestHookMetrics();
        metrics.manifestHooksExecuted =
          manifestHookMetrics?.manifestHooksExecuted ?? 0;
        metrics.manifestHooksReused =
          manifestHookMetrics?.manifestHooksReused ?? 0;
        metrics.manifestHookCacheHit =
          manifestHookMetrics?.manifestHookCacheHit ?? 0;
        metrics.manifestHookCacheMiss =
          manifestHookMetrics?.manifestHookCacheMiss ?? 0;
        metrics.manifestHookDurationMs =
          manifestHookMetrics?.manifestHookDurationMs ?? 0;
        metrics.manifestHookPlugins = manifestHookMetrics?.byPlugin ?? {};

        const emittedGeneratedOutputCount = await measure(
          timingsMs,
          "generatedOutputs",
          () =>
            emitGeneratedOutputs(
              module,
              (asset) => {
                measureSync(timingsMs, "outputWrite", () =>
                  this.emitFile(asset),
                );
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
              measureSync(timingsMs, "outputWrite", () =>
                this.emitFile({
                  type: "asset",
                  fileName: path,
                  source: decodeOutput(cached),
                }),
              );
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
        pendingOutputCache = {
          path: outputCachePath,
          state: nextOutputCache,
          outDir,
          publicDir: config.publicDir,
          configFile: config.configFile,
        };
        await writeSsgOutputMetrics(metrics);
        this.info(
          `SSG outputs: ${metrics.renderedOutputCount} rendered · ${metrics.reusedOutputCount} reused · ${metrics.deletedOutputCount} removed`,
        );
        inspectGeneratedHtmlPages(module, generatedHtml, {
          warn: (message) => this.warn(message),
          info: (message) => this.info(message),
        });
        logGeneratedHtmlAssetDiagnostics(this, generatedHtml);
      } finally {
        await server.close();
        await discardClientBuildArtifacts(clientBuildArtifacts);
        clientBuildArtifacts = undefined;
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
      if (!pendingOutputCache) return;
      try {
        pendingOutputCache.state.finalOutputInventory =
          await fingerprintOutputDirectory(pendingOutputCache.outDir);
        pendingOutputCache.state.publicDirectory = pendingOutputCache.publicDir
          ? resolve(pendingOutputCache.publicDir)
          : undefined;
        pendingOutputCache.state.publicFingerprint =
          pendingOutputCache.publicDir
            ? await fingerprintDirectory(resolve(pendingOutputCache.publicDir))
            : undefined;
        await saveOutputCache(
          pendingOutputCache.path,
          pendingOutputCache.state,
        );
      } catch (error) {
        this.warn(
          `SSG output cache could not be saved; the next build regenerates every output. ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      } finally {
        pendingOutputCache = undefined;
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

async function preserveClientBuildArtifacts(
  outDir: string,
): Promise<ClientBuildArtifacts | undefined> {
  const manifestPath = ".vite/manifest.json";
  let manifestSource: string;
  try {
    manifestSource = await readFile(join(outDir, manifestPath), "utf8");
  } catch (error) {
    if (isNotFoundError(error)) return undefined;
    throw error;
  }

  const paths = [manifestPath, ...collectClientAssetPaths(manifestSource)];
  const stagingDirectory = join(
    dirname(outDir),
    ".riebeckite",
    `client-build-${randomUUID()}`,
  );
  for (const relativePath of paths) {
    const source = resolveBuildArtifactPath(outDir, relativePath);
    const destination = resolveBuildArtifactPath(
      stagingDirectory,
      relativePath,
    );
    await mkdir(dirname(destination), { recursive: true });
    await rename(source, destination);
  }
  return {
    stagingDirectory,
    paths,
    manifestFingerprint: createHash("sha256")
      .update(manifestSource)
      .digest("hex"),
  };
}

async function restoreClientBuildArtifacts(
  outDir: string,
  artifacts: ClientBuildArtifacts | undefined,
): Promise<void> {
  if (!artifacts) return;
  for (const relativePath of artifacts.paths) {
    const source = resolveBuildArtifactPath(
      artifacts.stagingDirectory,
      relativePath,
    );
    const destination = resolveBuildArtifactPath(outDir, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await rename(source, destination);
  }
}

async function discardClientBuildArtifacts(
  artifacts: ClientBuildArtifacts | undefined,
): Promise<void> {
  if (!artifacts) return;
  await rm(artifacts.stagingDirectory, { recursive: true, force: true });
}

function collectClientAssetPaths(manifestSource: string): string[] {
  let manifest: unknown;
  try {
    manifest = JSON.parse(manifestSource);
  } catch (error) {
    throw new Error(
      `Vite client manifest could not be parsed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (
    typeof manifest !== "object" ||
    manifest === null ||
    Array.isArray(manifest)
  ) {
    throw new Error("Vite client manifest must be an object.");
  }

  const paths = new Set<string>();
  for (const entry of Object.values(manifest)) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      continue;
    }
    const assets = entry as Record<string, unknown>;
    addClientAssetPath(paths, assets.file);
    addClientAssetPaths(paths, assets.css);
    addClientAssetPaths(paths, assets.assets);
  }
  return [...paths].sort();
}

function addClientAssetPath(paths: Set<string>, value: unknown): void {
  if (typeof value === "string") paths.add(value);
}

function addClientAssetPaths(paths: Set<string>, value: unknown): void {
  if (!Array.isArray(value)) return;
  for (const path of value) addClientAssetPath(paths, path);
}

function resolveBuildArtifactPath(
  directory: string,
  relativePath: string,
): string {
  if (
    !relativePath ||
    relativePath.startsWith("/") ||
    relativePath.includes("\0")
  ) {
    throw new Error(
      `Vite client manifest has an invalid asset path: ${relativePath}`,
    );
  }
  const file = resolve(directory, relativePath);
  const relativePathFromDirectory = relative(directory, file);
  if (
    relativePathFromDirectory.startsWith("..") ||
    relativePathFromDirectory === "" ||
    isAbsolutePath(relativePathFromDirectory)
  ) {
    throw new Error(
      `Vite client manifest has an unsafe asset path: ${relativePath}`,
    );
  }
  return file;
}

function isAbsolutePath(path: string): boolean {
  return /^([a-z]:)?[\\/]/iu.test(path);
}

function formatSsrNoExternal(): string {
  return "/^honox(?:\\/.*)?$/";
}

function logSsgDiagnostics(
  logger: { info(message: string): void },
  message: string,
): void {
  if (process.env.RIEBECKITE_SSG_DIAGNOSTICS !== "1") return;
  logger.info(`[riebeckite-ssg] ${message}`);
}

function logGeneratedHtmlAssetDiagnostics(
  logger: { info(message: string): void },
  pages: readonly { path: string; html: string }[],
): void {
  if (process.env.RIEBECKITE_SSG_DIAGNOSTICS !== "1") return;
  const renderedPages = pages.filter(
    (page) =>
      !/<meta\b[^>]*\bhttp-equiv=["']refresh["'][^>]*\bcontent=["'][^"']*\burl=/iu.test(
        page.html,
      ),
  );
  const cssPages = renderedPages.filter((page) =>
    /<link\b[^>]*\brel=["'][^"']*\bstylesheet\b[^"']*["']/iu.test(page.html),
  );
  const scriptPages = renderedPages.filter((page) =>
    /<script\b[^>]*\bsrc=["'][^"']+["']/iu.test(page.html),
  );
  const missingCss = renderedPages
    .filter((page) => !cssPages.includes(page))
    .map((page) => page.path);
  const missingScript = renderedPages
    .filter((page) => !scriptPages.includes(page))
    .map((page) => page.path);
  logger.info(
    `[riebeckite-ssg] rendered HTML assets: ${pages.length} documents (${renderedPages.length} pages, ${pages.length - renderedPages.length} redirects) · CSS ${cssPages.length} · JavaScript ${scriptPages.length} · missing CSS ${missingCss.length} · missing JavaScript ${missingScript.length}`,
  );
  if (missingCss.length > 0 || missingScript.length > 0) {
    logger.info(
      `[riebeckite-ssg] missing asset references: CSS ${missingCss.join(", ") || "none"} · JavaScript ${missingScript.join(", ") || "none"}`,
    );
  }
}

export function shouldApplyRiebeckiteSsg(
  _config: unknown,
  env: ConfigEnv,
): boolean {
  return env.command === "build" && env.mode !== "client";
}

export function findBuildOutputSiteCollisions(
  buildOutputPaths: Iterable<string>,
  siteOwnedOutputPaths: ReadonlySet<string>,
): readonly string[] {
  const collisions = new Set<string>();
  for (const path of buildOutputPaths) {
    if (siteOwnedOutputPaths.has(path)) collisions.add(path);
  }
  return [...collisions].sort();
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
  if (affectedPaths?.size === 0) return 0;

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

export async function verifyNoChangeFastPath(input: {
  readonly root: string;
  readonly outputDirectory: string;
  readonly expectedOutputPaths: readonly string[];
  readonly metrics?: NoChangeFastPathOutputMetrics;
}): Promise<NoChangeFastPathResult> {
  const outputCachePath = join(
    input.root,
    ".riebeckite",
    "ssg-output-cache.json",
  );
  const cache = await loadFastPathCache(fastPathCachePath(outputCachePath));
  if (!cache)
    return { used: false, blockReason: "output-cache-missing-or-invalid" };
  if (cache.outputCacheChecksum !== (await checksumFile(outputCachePath))) {
    return { used: false, blockReason: "output-cache-missing-or-invalid" };
  }
  if (
    cache.appFingerprint !==
    (await computeAppFingerprint(input.root, cache.configFile))
  ) {
    return { used: false, blockReason: "app-fingerprint-changed" };
  }
  if (
    cache.publicDirectory &&
    cache.publicFingerprint !==
      (await fingerprintDirectory(cache.publicDirectory))
  ) {
    return { used: false, blockReason: "static-assets-changed" };
  }
  if (
    input.expectedOutputPaths.some(
      (output) =>
        !cache.outputPaths.includes(output) || !cache.finalOutputInventory[output],
    )
  ) {
    return { used: false, blockReason: "output-cache-incomplete" };
  }
  const inventoryStartedAt = performance.now();
  const currentInventory = await fingerprintOutputDirectory(
    input.outputDirectory,
    "",
    input.metrics,
  );
  if (input.metrics)
    input.metrics.outputInventoryValidationDurationMs +=
      performance.now() - inventoryStartedAt;
  if (!inventoriesEqual(cache.finalOutputInventory, currentInventory)) {
    return { used: false, blockReason: "output-inventory-mismatch" };
  }
  return { used: true };
}

async function fingerprintDirectory(directory: string): Promise<string> {
  const inventory = await fingerprintOutputDirectory(directory);
  const hash = createHash("sha256");
  for (const [path, checksum] of Object.entries(inventory).sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    hash.update(path).update("\0").update(checksum).update("\0");
  }
  return hash.digest("hex");
}

async function fingerprintOutputDirectory(
  directory: string,
  relativeDirectory = "",
  metrics?: NoChangeFastPathOutputMetrics,
): Promise<Record<string, string>> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    (error: unknown) => {
      if (isMissingDirectoryError(error)) return undefined;
      throw error;
    },
  );
  if (!entries) return {};
  const inventory: Record<string, string> = {};
  for (const entry of entries) {
    const file = join(directory, entry.name);
    const relativePath = join(relativeDirectory, entry.name).replaceAll(
      "\\",
      "/",
    );
    if (entry.isDirectory()) {
      Object.assign(
        inventory,
        await fingerprintOutputDirectory(file, relativePath, metrics),
      );
      continue;
    }
    if (entry.isFile()) {
      const hashedAt = performance.now();
      const content = await readFile(file);
      inventory[relativePath] = createHash("sha256")
        .update(content)
        .digest("hex");
      if (metrics) {
        metrics.outputHashValidationDurationMs += performance.now() - hashedAt;
        metrics.outputFilesHashed += 1;
        metrics.outputBytesHashed += content.length;
      }
    }
  }
  return inventory;
}

function inventoriesEqual(
  left: Record<string, string>,
  right: Record<string, string>,
): boolean {
  const leftPaths = Object.keys(left);
  const rightPaths = Object.keys(right);
  return (
    leftPaths.length === rightPaths.length &&
    leftPaths.every((path) => left[path] === right[path])
  );
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
    clientManifestFingerprint?: unknown;
    outputs?: unknown;
    finalOutputInventory?: unknown;
    publicDirectory?: unknown;
    publicFingerprint?: unknown;
    configFile?: unknown;
  };
  return (
    candidate.version === 3 &&
    (candidate.appFingerprint === undefined ||
      typeof candidate.appFingerprint === "string") &&
    (candidate.clientManifestFingerprint === undefined ||
      typeof candidate.clientManifestFingerprint === "string") &&
    isOutputCacheEntries(candidate.outputs) &&
    (candidate.finalOutputInventory === undefined ||
      isOutputInventory(candidate.finalOutputInventory)) &&
    (candidate.publicDirectory === undefined ||
      typeof candidate.publicDirectory === "string") &&
    (candidate.publicFingerprint === undefined ||
      typeof candidate.publicFingerprint === "string") &&
    (candidate.configFile === undefined ||
      typeof candidate.configFile === "string")
  );
}

function isOutputInventory(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((checksum) => typeof checksum === "string")
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
      typeof (entry as OutputCacheEntry).checksum === "string" &&
      ((entry as OutputCacheEntry).encoding === "utf8" ||
        (entry as OutputCacheEntry).encoding === "base64") &&
      (entry as OutputCacheEntry).checksum ===
        checksumOutput(entry as OutputCacheEntry),
  );
}

export async function saveOutputCache(
  path: string,
  state: OutputCacheState,
  timingsMs?: Record<string, number>,
): Promise<string> {
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
    const checksum = createHash("sha256").update(serialized).digest("hex");
    if (state.finalOutputInventory && state.configFile) {
      await saveFastPathCache(
        fastPathCachePath(path),
        createFastPathCacheState(state, checksum),
      );
    }
    return checksum;
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

function fastPathCachePath(outputCachePath: string): string {
  return outputCachePath.replace(/\.json$/, ".fast-path.json");
}

function createFastPathCacheState(
  state: OutputCacheState,
  outputCacheChecksum: string,
): FastPathCacheState {
  if (!state.finalOutputInventory || !state.configFile) {
    throw new Error("SSG output cache is missing fast-path validation data.");
  }
  return {
    version: 1,
    outputCacheChecksum,
    appFingerprint: state.appFingerprint,
    finalOutputInventory: state.finalOutputInventory,
    publicDirectory: state.publicDirectory,
    publicFingerprint: state.publicFingerprint,
    configFile: state.configFile,
    outputPaths: Object.keys(state.outputs).sort(),
  };
}

async function saveFastPathCache(
  path: string,
  state: FastPathCacheState,
): Promise<void> {
  const directory = dirname(path);
  await mkdir(directory, { recursive: true });
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(state)}\n`, "utf8");
    await replaceFile(temporaryPath, path);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function loadFastPathCache(
  path: string,
): Promise<FastPathCacheState | undefined> {
  try {
    const candidate: unknown = JSON.parse(await readFile(path, "utf8"));
    return isFastPathCacheState(candidate) ? candidate : undefined;
  } catch {
    return undefined;
  }
}

function isFastPathCacheState(value: unknown): value is FastPathCacheState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<FastPathCacheState>;
  return (
    candidate.version === 1 &&
    typeof candidate.outputCacheChecksum === "string" &&
    (candidate.appFingerprint === undefined ||
      typeof candidate.appFingerprint === "string") &&
    isOutputInventory(candidate.finalOutputInventory) &&
    (candidate.publicDirectory === undefined ||
      typeof candidate.publicDirectory === "string") &&
    (candidate.publicFingerprint === undefined ||
      typeof candidate.publicFingerprint === "string") &&
    typeof candidate.configFile === "string" &&
    Array.isArray(candidate.outputPaths) &&
    candidate.outputPaths.every((path) => typeof path === "string")
  );
}

async function checksumFile(path: string): Promise<string | undefined> {
  const hash = createHash("sha256");
  try {
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    return hash.digest("hex");
  } catch {
    return undefined;
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
  const entry =
    typeof source === "string"
      ? { source, encoding: "utf8" as const }
      : {
          source: Buffer.from(source).toString("base64"),
          encoding: "base64" as const,
        };
  return { ...entry, checksum: checksumOutput(entry) };
}

function checksumOutput(
  entry: Pick<OutputCacheEntry, "source" | "encoding">,
): string {
  return createHash("sha256")
    .update(entry.encoding)
    .update("\0")
    .update(entry.source)
    .digest("hex");
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
