import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  copyFile,
  lstat,
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
  outputCacheDecision: OutputCacheDecision;
  outputCacheRejectionReason: OutputCacheRejectionReason | null;
  timingsMs: Record<string, number>;
};

export type OutputCacheRejectionReason =
  | "change-set-unavailable"
  | "full-regeneration-required"
  | "output-cache-missing-or-invalid"
  | "app-fingerprint-changed"
  | "client-manifest-fingerprint-changed"
  | "unchanged-output-not-cached";

export type OutputCacheDecision = {
  readonly changeSetPresent: boolean;
  readonly changeSetRequiresFullRegeneration: boolean;
  readonly outputCacheLoaded: boolean;
  readonly appFingerprintMatch: boolean;
  readonly clientManifestFingerprintMatch: boolean;
  readonly uncoveredUnchangedCount: number;
};

export function decideOutputCacheRejection(
  decision: OutputCacheDecision,
): OutputCacheRejectionReason | undefined {
  if (!decision.changeSetPresent) return "change-set-unavailable";
  if (decision.changeSetRequiresFullRegeneration)
    return "full-regeneration-required";
  if (!decision.outputCacheLoaded) return "output-cache-missing-or-invalid";
  if (!decision.appFingerprintMatch) return "app-fingerprint-changed";
  if (!decision.clientManifestFingerprintMatch)
    return "client-manifest-fingerprint-changed";
  if (decision.uncoveredUnchangedCount > 0)
    return "unchanged-output-not-cached";
  return undefined;
}

type OutputCacheEntry = {
  cachePath: string;
  checksum: string;
};

type OutputCacheState = {
  version: 4;
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
const faultInjectionCounts = new Map<string, number>();
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
        metrics: SsgOutputMetrics;
        timingsMs: Record<string, number> | undefined;
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
      await emptyBuildOutputDirectory(outDir);
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

      const timingsMs: Record<string, number> | undefined = process.env
        .RIEBECKITE_SSG_METRICS_FILE
        ? {}
        : undefined;
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
        const uncoveredUnchangedCount = outputChangeSet
          ? outputChangeSet.unchanged.filter(
              (output) =>
                !siteOwnedOutputPaths.has(output.path) &&
                !previousOutputCache?.outputs[output.path],
            ).length
          : 0;
        const outputCacheDecision: OutputCacheDecision = {
          changeSetPresent: outputChangeSet !== undefined,
          changeSetRequiresFullRegeneration:
            outputChangeSet?.fullRegenerationRequired ?? true,
          outputCacheLoaded: previousOutputCache !== undefined,
          appFingerprintMatch:
            previousOutputCache?.appFingerprint === appFingerprint,
          clientManifestFingerprintMatch:
            previousOutputCache?.clientManifestFingerprint ===
            clientBuildArtifacts?.manifestFingerprint,
          uncoveredUnchangedCount,
        };
        const outputCacheRejectionReason =
          decideOutputCacheRejection(outputCacheDecision);
        const canUseIncremental = outputCacheRejectionReason === undefined;
        const reusablePaths = new Set<string>(
          canUseIncremental
            ? (outputChangeSet?.unchanged ?? []).map((output) => output.path)
            : [],
        );
        logSsgDiagnostics(
          this,
          `output cache ${canUseIncremental ? "hit" : `miss (${outputCacheRejectionReason})`} · ${reusablePaths.size} reusable outputs`,
        );
        const shadowedOutputs = new Set<string>();
        const skippedRouteCount = canUseIncremental
          ? (outputChangeSet?.unchanged ?? []).filter(
              (output) => output.kind !== "generated",
            ).length
          : 0;
        const generatedHtml: { path: string; html: string }[] = [];
        const nextOutputCache: OutputCacheState = {
          version: 4,
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
          outputCacheDecision,
          outputCacheRejectionReason: outputCacheRejectionReason ?? null,
          timingsMs: timingsMs ?? {},
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
                nextOutputCache.outputs[fileName] = {
                  cachePath: "",
                  checksum: "",
                };
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
                nextOutputCache.outputs[asset.fileName] = {
                  cachePath: "",
                  checksum: "",
                };
              },
              canUseIncremental
                ? new Set(
                    (outputChangeSet?.affected ?? [])
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
        if (canUseIncremental && outputChangeSet && previousOutputCache) {
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
                source: await decodeOutput(outputCachePath, cached),
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
        pendingOutputCache = {
          path: outputCachePath,
          state: nextOutputCache,
          metrics,
          timingsMs,
          outDir,
          publicDir: config.publicDir,
          configFile: config.configFile,
        };
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
    closeBundle: {
      order: "post",
      async handler() {
        if (!resolvedConfig) return;

        const outDir = resolve(
          resolvedConfig.root,
          resolvedConfig.build.outDir,
        );
        const oversizedAssets = await findOversizedAssets(outDir);
        for (const asset of oversizedAssets) {
          this.warn(
            `Generated asset ${asset.path} is ${formatBytes(asset.size)}, exceeding Cloudflare Workers' ${formatBytes(cloudflareWorkerAssetLimit)} asset limit.`,
          );
        }
        const outputCache = pendingOutputCache;
        if (!outputCache) return;
        try {
          outputCache.state.finalOutputInventory = await measure(
            outputCache.timingsMs,
            "outputInventory",
            () => fingerprintOutputDirectory(outputCache.outDir),
          );
          const publicDir = outputCache.publicDir;
          outputCache.state.publicDirectory = publicDir
            ? resolve(publicDir)
            : undefined;
          outputCache.state.publicFingerprint = publicDir
            ? await measure(outputCache.timingsMs, "publicFingerprint", () =>
                fingerprintDirectory(resolve(publicDir)),
              )
            : undefined;
          await waitForFaultInjection("build-state-before");
          await saveOutputCache(
            outputCache.path,
            outputCache.state,
            outputCache.outDir,
            outputCache.timingsMs,
          );
          await waitForFaultInjection("build-state-committed");
        } catch (error) {
          this.warn(
            `SSG output cache could not be saved; the next build regenerates every output. ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        } finally {
          await writeSsgOutputMetrics(outputCache.metrics);
          pendingOutputCache = undefined;
        }
      },
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

export async function emptyBuildOutputDirectory(outDir: string): Promise<void> {
  const entries = await readdir(outDir, { withFileTypes: true }).catch(
    (error: unknown) => {
      if (isMissingDirectoryError(error)) return [];
      throw error;
    },
  );
  for (const entry of entries) {
    await rm(join(outDir, entry.name), { recursive: true, force: true });
  }
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
        !cache.outputPaths.includes(output) ||
        !cache.finalOutputInventory[output],
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
  if (!(await isSafeOutputCacheDirectory(dirname(path)))) {
    log("SSG output cache directory is unsafe and will be ignored.");
    return undefined;
  }
  if (!(await isRegularFile(path))) {
    return undefined;
  }
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
  const entriesAreValid = await measure(
    timingsMs,
    "outputCacheEntriesValidate",
    () => validateOutputCacheEntries(path, parsed.outputs, timingsMs),
  );
  if (!entriesAreValid) {
    log("SSG output cache entries are corrupted and will be rebuilt.");
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
    candidate.version === 4 &&
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
    Object.entries(value).every(
      ([outputPath, checksum]) =>
        isSafeLogicalOutputPath(outputPath) && isChecksum(checksum),
    )
  );
}

function isOutputCacheEntries(
  value: unknown,
): value is OutputCacheState["outputs"] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.entries(value).every(
    ([outputPath, entry]) =>
      isSafeLogicalOutputPath(outputPath) &&
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as OutputCacheEntry).cachePath === "string" &&
      (entry as OutputCacheEntry).cachePath ===
        outputCacheEntryName(outputPath) &&
      isChecksum((entry as OutputCacheEntry).checksum),
  );
}

export async function saveOutputCache(
  path: string,
  state: OutputCacheState,
  outputDirectory: string,
  timingsMs?: Record<string, number>,
): Promise<string> {
  const directory = dirname(path);
  await mkdir(directory, { recursive: true });
  if (!(await isSafeOutputCacheDirectory(directory))) {
    throw new Error(`Unsafe SSG output cache directory: ${directory}`);
  }
  if (!(await isSafeCacheFileTarget(path))) {
    throw new Error(`Unsafe SSG output cache file: ${path}`);
  }
  const entriesPath = outputCacheEntriesPath(path);
  const temporaryPath = `${path}.${randomUUID()}.tmp`;

  try {
    await waitForFaultInjection("metadata-save-start");
    const outputs = await measure(timingsMs, "outputCacheEntriesWrite", () =>
      saveOutputCacheEntries(
        entriesPath,
        outputDirectory,
        state.outputs,
        state.finalOutputInventory,
        timingsMs,
      ),
    );
    const serialized = measureSync(
      timingsMs,
      "outputCacheSerialize",
      () => `${JSON.stringify({ ...state, outputs })}\n`,
    );
    await measure(timingsMs, "outputCacheWrite", () =>
      writeFile(temporaryPath, serialized, "utf8"),
    );
    await measure(timingsMs, "outputCacheRename", () =>
      replaceFile(temporaryPath, path),
    );
    await waitForFaultInjection("metadata-committed");
    const checksum = createHash("sha256").update(serialized).digest("hex");
    if (state.finalOutputInventory && state.configFile) {
      await saveFastPathCache(
        fastPathCachePath(path),
        createFastPathCacheState(state, checksum),
        timingsMs,
      );
    }
    await collectUnreferencedOutputCacheEntries(
      outputCacheEntriesPath(path),
      outputs,
      timingsMs,
    );
    return checksum;
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

function outputCacheEntriesPath(outputCachePath: string): string {
  return outputCachePath.replace(/\.json$/, ".entries");
}

async function saveOutputCacheEntries(
  directory: string,
  outputDirectory: string,
  outputs: Readonly<Record<string, OutputCacheEntry>>,
  finalOutputInventory: Readonly<Record<string, string>> | undefined,
  timingsMs: Record<string, number> | undefined,
): Promise<Record<string, OutputCacheEntry>> {
  await ensureOutputCacheEntriesDirectory(directory);
  const entries: Record<string, OutputCacheEntry> = {};
  for (const outputPath of Object.keys(outputs).sort()) {
    assertSafeLogicalOutputPath(outputPath);
    const existing = outputs[outputPath];
    if (existing.cachePath && existing.checksum) {
      if (
        existing.cachePath !== outputCacheEntryName(outputPath) ||
        !isChecksum(existing.checksum)
      ) {
        throw new Error(`Invalid SSG output cache entry: ${outputPath}`);
      }
      entries[outputPath] = existing;
      continue;
    }
    const source = resolveOutputCacheFile(outputDirectory, outputPath);
    const cachePath = outputCacheEntryName(outputPath);
    const destination = join(directory, cachePath);
    await waitForFaultInjection("entry-create-start");
    await replaceOutputCacheEntry(source, destination, timingsMs);
    const checksum = finalOutputInventory?.[outputPath];
    if (!checksum) {
      const cachedChecksum = await checksumFile(destination);
      if (!cachedChecksum) {
        throw new Error(`Could not checksum cached output: ${outputPath}`);
      }
      entries[outputPath] = { cachePath, checksum: cachedChecksum };
      continue;
    }
    entries[outputPath] = { cachePath, checksum };
  }
  return entries;
}

async function validateOutputCacheEntries(
  outputCachePath: string,
  entries: Readonly<Record<string, OutputCacheEntry>>,
  timingsMs?: Record<string, number>,
): Promise<boolean> {
  try {
    const directory = outputCacheEntriesPath(outputCachePath);
    if (!(await isSafeOutputCacheEntriesDirectory(directory))) return false;
    for (const [outputPath, entry] of Object.entries(entries)) {
      if (
        !isSafeLogicalOutputPath(outputPath) ||
        entry.cachePath !== outputCacheEntryName(outputPath) ||
        !isChecksum(entry.checksum)
      ) {
        return false;
      }
      const path = resolveOutputCacheFile(directory, entry.cachePath);
      if (!(await isRegularFile(path))) return false;
      if (
        (await measure(timingsMs, "outputCacheEntryChecksum", () =>
          checksumFile(path),
        )) !== entry.checksum
      )
        return false;
    }
    return true;
  } catch {
    return false;
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
  timingsMs?: Record<string, number>,
): Promise<void> {
  const directory = dirname(path);
  await mkdir(directory, { recursive: true });
  if (!(await isSafeOutputCacheDirectory(directory))) {
    throw new Error(`Unsafe SSG fast-path cache directory: ${directory}`);
  }
  if (!(await isSafeCacheFileTarget(path))) {
    throw new Error(`Unsafe SSG fast-path cache file: ${path}`);
  }
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  try {
    await waitForFaultInjection("sidecar-save-start");
    await measure(timingsMs, "sidecarWrite", () =>
      writeFile(temporaryPath, `${JSON.stringify(state)}\n`, "utf8"),
    );
    await measure(timingsMs, "sidecarRename", () =>
      replaceFile(temporaryPath, path),
    );
    await waitForFaultInjection("sidecar-committed");
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function loadFastPathCache(
  path: string,
): Promise<FastPathCacheState | undefined> {
  try {
    if (!(await isSafeOutputCacheDirectory(dirname(path)))) return undefined;
    if (!(await isRegularFile(path))) return undefined;
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
    candidate.outputPaths.every(isSafeLogicalOutputPath) &&
    candidate.outputPaths.every(
      (path, index, paths) => index === 0 || paths[index - 1] < path,
    )
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

async function decodeOutput(
  outputCachePath: string,
  entry: OutputCacheEntry,
): Promise<Uint8Array> {
  const file = resolveOutputCacheFile(
    outputCacheEntriesPath(outputCachePath),
    entry.cachePath,
  );
  const content = await readFile(file);
  const checksum = createHash("sha256").update(content).digest("hex");
  if (checksum !== entry.checksum) {
    throw new Error("SSG output cache entry checksum mismatch.");
  }
  return content;
}

function resolveOutputCacheFile(
  directory: string,
  relativePath: string,
): string {
  if (
    !relativePath ||
    relativePath.includes("\0") ||
    isAbsolutePath(relativePath)
  ) {
    throw new Error(`Invalid SSG output cache path: ${relativePath}`);
  }
  const file = resolve(directory, relativePath);
  const relativePathFromDirectory = relative(directory, file);
  if (
    relativePathFromDirectory.startsWith("..") ||
    relativePathFromDirectory === "" ||
    isAbsolutePath(relativePathFromDirectory)
  ) {
    throw new Error(`Unsafe SSG output cache path: ${relativePath}`);
  }
  return file;
}

function isSafeLogicalOutputPath(path: unknown): path is string {
  if (
    typeof path !== "string" ||
    !path ||
    path.includes("\\") ||
    path.includes("\0") ||
    isAbsolutePath(path)
  ) {
    return false;
  }
  try {
    resolveOutputCacheFile("/riebeckite-output-root", path);
    return true;
  } catch {
    return false;
  }
}

function assertSafeLogicalOutputPath(path: string): void {
  if (!isSafeLogicalOutputPath(path)) {
    throw new Error(`Invalid SSG output path: ${path}`);
  }
}

function outputCacheEntryName(outputPath: string): string {
  return createHash("sha256").update(outputPath).digest("hex");
}

function isChecksum(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

async function ensureOutputCacheEntriesDirectory(
  directory: string,
): Promise<void> {
  await mkdir(directory, { recursive: true });
  if (!(await isSafeOutputCacheEntriesDirectory(directory))) {
    throw new Error(`Unsafe SSG output cache entries directory: ${directory}`);
  }
}

async function isSafeOutputCacheDirectory(directory: string): Promise<boolean> {
  try {
    const info = await lstat(directory);
    return info.isDirectory() && !info.isSymbolicLink();
  } catch {
    return false;
  }
}

async function isSafeCacheFileTarget(path: string): Promise<boolean> {
  try {
    return !(await lstat(path)).isSymbolicLink();
  } catch (error) {
    return isNotFoundError(error);
  }
}

async function isSafeOutputCacheEntriesDirectory(
  directory: string,
): Promise<boolean> {
  return isSafeOutputCacheDirectory(directory);
}

async function isRegularFile(path: string): Promise<boolean> {
  try {
    const info = await lstat(path);
    return info.isFile() && !info.isSymbolicLink();
  } catch {
    return false;
  }
}

async function replaceOutputCacheEntry(
  source: string,
  destination: string,
  timingsMs?: Record<string, number>,
): Promise<void> {
  if ((await lstat(destination).catch(() => undefined))?.isSymbolicLink()) {
    throw new Error(`Unsafe SSG output cache entry: ${destination}`);
  }
  const temporaryPath = `${destination}.${randomUUID()}.tmp`;
  try {
    await measure(timingsMs, "outputCacheEntryWrite", () =>
      writeFile(temporaryPath, new Uint8Array()),
    );
    await waitForFaultInjection("entry-body-write");
    await measure(timingsMs, "outputCacheEntryCopy", () =>
      copyFile(source, temporaryPath),
    );
    await waitForFaultInjection("entry-rename-before");
    await measure(timingsMs, "outputCacheEntryRename", () =>
      replaceFile(temporaryPath, destination),
    );
    await waitForFaultInjection("entry-committed");
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function collectUnreferencedOutputCacheEntries(
  directory: string,
  outputs: Readonly<Record<string, OutputCacheEntry>>,
  timingsMs?: Record<string, number>,
): Promise<void> {
  try {
    if (!(await isSafeOutputCacheEntriesDirectory(directory))) return;
    await waitForFaultInjection("gc-start");
    const referenced = new Set(
      Object.values(outputs).map((entry) => entry.cachePath),
    );
    const entries = await measure(timingsMs, "outputCacheGcScan", () =>
      readdir(directory, { withFileTypes: true }),
    );
    for (const entry of entries) {
      if (!/^[a-f0-9]{64}$/u.test(entry.name) || referenced.has(entry.name)) {
        continue;
      }
      const path = join(directory, entry.name);
      if (await isRegularFile(path)) {
        await waitForFaultInjection("gc-entry-delete");
        await measure(timingsMs, "outputCacheGcDelete", () =>
          rm(path, { force: true }),
        );
      }
    }
  } catch {
    return;
  }
}

async function waitForFaultInjection(point: string): Promise<void> {
  if (
    process.env.NODE_ENV !== "test" ||
    process.env.RIEBECKITE_SSG_FAULT_INJECTION !== "1" ||
    process.env.RIEBECKITE_SSG_FAULT_POINT !== point
  ) {
    return;
  }
  const occurrence = Number.parseInt(
    process.env.RIEBECKITE_SSG_FAULT_OCCURRENCE ?? "1",
    10,
  );
  const count = (faultInjectionCounts.get(point) ?? 0) + 1;
  faultInjectionCounts.set(point, count);
  if (
    !Number.isSafeInteger(occurrence) ||
    occurrence < 1 ||
    count !== occurrence
  )
    return;
  const signalFile = process.env.RIEBECKITE_SSG_FAULT_SIGNAL_FILE;
  if (!signalFile) return;
  await writeFile(signalFile, `${point}\n`, "utf8");
  await new Promise<void>(() => {});
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
  if (!timingsMs) return await fn();
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
  if (!timingsMs) return fn();
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
