import { rm } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { buildOutputPlan, compareOutputPlan } from "@riebeckite/core";
import { defaultExtensionMap, redirectPlugin, toSSG } from "hono/ssg";
import {
  type ConfigEnv,
  createServer,
  type Plugin,
  type ResolvedConfig,
} from "vite";
import { collectSiteOwnedOutputPaths } from "./content_assets.js";
import {
  CLOUDFLARE_WORKER_ASSET_LIMIT,
  type ClientBuildArtifacts,
  collectBuildOutputPaths,
  discardClientBuildArtifacts,
  emptyBuildOutputDirectory,
  findOversizedAssets,
  formatBytes,
  preserveClientBuildArtifacts,
  restoreClientBuildArtifacts,
} from "./ssg/build_output.js";
import {
  formatSsrNoExternal,
  inspectGeneratedHtmlPages,
  logGeneratedHtmlAssetDiagnostics,
  logSsgDiagnostics,
} from "./ssg/diagnostics.js";
import {
  computeAppFingerprint,
  fingerprintDirectory,
  fingerprintOutputDirectory,
} from "./ssg/inventory.js";
import {
  decideOutputCacheRejection,
  decodeOutput,
  loadOutputCache,
  type OutputCacheState,
  saveOutputCache,
  waitForFaultInjection,
} from "./ssg/output_cache.js";
import {
  measure,
  measureSync,
  writeSsgOutputMetrics,
} from "./ssg/runtime_metrics.js";
import type {
  GeneratedOutputAsset,
  OutputCacheDecision,
  SsgModule,
  SsgOutputChangeSet,
  SsgOutputMetrics,
} from "./ssg/types.js";

export { emptyBuildOutputDirectory } from "./ssg/build_output.js";
export {
  createNoChangeFastPathOutputMetrics,
  decideOutputCacheRejection,
  loadOutputCache,
  saveOutputCache,
  verifyNoChangeFastPath,
} from "./ssg/output_cache.js";
export type {
  NoChangeFastPathOutputMetrics,
  NoChangeFastPathResult,
  OutputCacheDecision,
  OutputCacheRejectionReason,
} from "./ssg/types.js";

type ToSsgOptions = NonNullable<Parameters<typeof toSSG>[2]>;

export type RiebeckiteSsgOptions = {
  entry?: string;
  plugins?: ToSsgOptions["plugins"];
  extensionMap?: Record<string, string>;
};

const defaultEntry = "./src/index.tsx";

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
        outputPlanInput: {
          inventory: SsgOutputChangeSet["affected"];
          affectedPaths: ReadonlySet<string>;
          removed: SsgOutputChangeSet["removed"];
          cacheAvailable: boolean;
          honoStaticRoutePaths: ReadonlySet<string>;
          viteClientAssetPaths: ReadonlySet<string>;
          sitePublicAssetPaths: ReadonlySet<string>;
        };
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
      let viteClientAssetPaths: string[] = [];
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
        viteClientAssetPaths = await collectBuildOutputPaths(outDir);
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
        viteClientAssetPaths = [
          ...new Set([...viteClientAssetPaths, ...Object.keys(bundle)]),
        ]
          .filter((outputPath) => !siteOwnedOutputPaths.has(outputPath))
          .sort();
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
        const inventory = [
          ...(outputChangeSet?.affected ?? []),
          ...(outputChangeSet?.unchanged ?? []),
        ];
        const inventoryPaths = new Set(inventory.map((output) => output.path));
        const honoStaticRoutePaths = new Set<string>();
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
          plannedOutputCount: 0,
          actualOutputCount: 0,
          matchedOutputCount: 0,
          missingInPlanCount: 0,
          missingInDistCount: 0,
          unknownOutputCount: 0,
          ownerConflictCount: 0,
          publicationViolationCount: 0,
          plannedGenerateOutputCount: 0,
          plannedReuseOutputCount: 0,
          plannedRemoveOutputCount: 0,
          plannedUnknownOutputCount: 0,
          outputPlanMemoryDeltaBytes: 0,
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
                if (!inventoryPaths.has(fileName)) {
                  honoStaticRoutePaths.add(fileName);
                }
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
          outputPlanInput: {
            inventory,
            affectedPaths: new Set(
              (outputChangeSet?.affected ?? []).map((output) => output.path),
            ),
            removed: outputChangeSet?.removed ?? [],
            cacheAvailable: canUseIncremental,
            honoStaticRoutePaths,
            viteClientAssetPaths: new Set(viteClientAssetPaths),
            sitePublicAssetPaths: siteOwnedOutputPaths,
          },
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
            `Generated asset ${asset.path} is ${formatBytes(asset.size)}, exceeding Cloudflare Workers' ${formatBytes(CLOUDFLARE_WORKER_ASSET_LIMIT)} asset limit.`,
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
          const finalOutputInventory = outputCache.state.finalOutputInventory;
          const outputPlanRssBefore = process.memoryUsage().rss;
          const outputPlan = measureSync(
            outputCache.timingsMs,
            "outputPlan",
            () =>
              buildOutputPlan({
                ...outputCache.outputPlanInput,
              }),
          );
          const outputPlanComparison = measureSync(
            outputCache.timingsMs,
            "outputPlanComparison",
            () =>
              compareOutputPlan(outputPlan, Object.keys(finalOutputInventory)),
          );
          outputCache.metrics.plannedOutputCount = outputPlan.entries.length;
          outputCache.metrics.actualOutputCount =
            Object.keys(finalOutputInventory).length;
          outputCache.metrics.matchedOutputCount =
            outputPlanComparison.matched.length;
          outputCache.metrics.missingInPlanCount =
            outputPlanComparison.missingInPlan.length;
          outputCache.metrics.missingInDistCount =
            outputPlanComparison.missingInDist.length;
          outputCache.metrics.unknownOutputCount =
            outputPlanComparison.unknown.length;
          outputCache.metrics.ownerConflictCount =
            outputPlanComparison.ownerConflicts.length;
          outputCache.metrics.publicationViolationCount =
            outputPlanComparison.publicationViolations.length;
          outputCache.metrics.plannedGenerateOutputCount =
            outputPlan.entries.filter(
              (entry) => entry.action === "generate",
            ).length;
          outputCache.metrics.plannedReuseOutputCount =
            outputPlan.entries.filter(
              (entry) => entry.action === "reuse",
            ).length;
          outputCache.metrics.plannedRemoveOutputCount =
            outputPlan.entries.filter(
              (entry) => entry.action === "remove",
            ).length;
          outputCache.metrics.plannedUnknownOutputCount =
            outputPlan.entries.filter(
              (entry) => entry.action === "unknown",
            ).length;
          outputCache.metrics.outputPlanMemoryDeltaBytes = Math.max(
            0,
            process.memoryUsage().rss - outputPlanRssBefore,
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
