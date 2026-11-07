import { randomUUID } from "node:crypto";
import { lstat, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import {
  BUILD_OUTPUT_MARKER_FILE,
  buildOutputPlan,
  compareOutputPlan,
  createBuildOutputMarker,
  publicationFingerprint as fingerprintPublication,
  isDeferredGeneratedOutput,
  publicationEntriesFromManifest,
  publicationOutputsFromManifest,
  publicationRedirectsFromManifest,
  serializeBuildOutputMarker,
} from "@riebeckite/core";
import type { toSSG } from "hono/ssg";
import type { ConfigEnv, Plugin, ResolvedConfig } from "vite";
import { collectSiteOwnedOutputPaths } from "./content_assets.js";
import {
  type BuildArtifactWriter,
  createBuildArtifactWriter,
} from "./ssg/artifact_writer.js";
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
  computeBundleFingerprint,
  fingerprintDirectory,
  fingerprintOutputContent,
  fingerprintOutputDirectory,
  fingerprintOutputInventory,
} from "./ssg/inventory.js";
import {
  decideOutputCacheRejection,
  loadOutputCacheMetadata,
  type OutputCacheState,
  resolveOutputCacheEntryPath,
  saveOutputCache,
  validateOutputCache,
} from "./ssg/output_cache.js";
import { runSsg } from "./ssg/runner.js";
import {
  measure,
  measureSync,
  writeSsgOutputMetrics,
} from "./ssg/runtime_metrics.js";
import {
  isStandaloneSsgMode,
  loadStandaloneSsgBundle,
} from "./ssg/standalone.js";
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
  concurrency?: number;
};

const defaultEntry = "./src/index.tsx";

export function riebeckiteSsg(options: RiebeckiteSsgOptions = {}): Plugin {
  const virtualId = "virtual:riebeckite-ssg-void-entry";
  const resolvedVirtualId = `\0${virtualId}`;
  const entry = options.entry ?? defaultEntry;
  let resolvedConfig: ResolvedConfig | undefined;
  let publicationOutputDirectory: string | undefined;
  let clientOutputDirectory: string | undefined;
  let artifactWriter: BuildArtifactWriter | undefined;
  let pendingOutputCache:
    | {
        path: string;
        state: OutputCacheState;
        metrics: SsgOutputMetrics;
        timingsMs: Record<string, number> | undefined;
        outDir: string;
        publicDir: string | false | undefined;
        configFile: string | undefined;
        publicationFingerprint?: string;
        outputPlanInput: {
          inventory: SsgOutputChangeSet["affected"];
          affectedPaths: ReadonlySet<string>;
          removed: SsgOutputChangeSet["removed"];
          cacheAvailable: boolean;
          honoStaticRoutePaths: ReadonlySet<string>;
          viteClientAssetPaths: ReadonlySet<string>;
          sitePublicAssetPaths: ReadonlySet<string>;
        };
        provenance: ReturnType<
          NonNullable<SsgModule["content"]>["getProvenance"]
        >;
        content: NonNullable<SsgModule["content"]> | undefined;
        reusablePaths: ReadonlySet<string>;
      }
    | undefined;
  let clientBuildArtifacts: ClientBuildArtifacts | undefined;
  const outputChecksums = new Map<string, string>();

  return {
    name: "riebeckite-ssg",
    apply: (_config, env) => env.command === "build",
    enforce: "post",
    config(config, env) {
      const root = resolve(config.root ?? process.cwd());
      publicationOutputDirectory = resolve(
        root,
        config.build?.outDir ?? "dist",
      );
      clientOutputDirectory = join(root, ".riebeckite", "build-output-client");
      return {
        build: {
          outDir:
            env.mode === "client"
              ? clientOutputDirectory
              : join(root, ".riebeckite", "build-output"),
          ...(env.mode === "client"
            ? {}
            : { rollupOptions: { input: [virtualId] } }),
        },
      };
    },
    configResolved(config) {
      resolvedConfig = config;
      if (config.mode === "client") {
        clientOutputDirectory = resolve(config.root, config.build.outDir);
      }
    },
    async buildStart() {
      const config = resolvedConfig;
      if (!config || config.mode === "client") return;
      outputChecksums.clear();
      if (!publicationOutputDirectory) {
        throw new Error(
          "Riebeckite SSG could not resolve the publication output directory.",
        );
      }
      artifactWriter = await createBuildArtifactWriter({
        outputDirectory: publicationOutputDirectory,
        stagingDirectory: resolve(config.root, config.build.outDir),
      });
      const outDir = resolve(config.root, config.build.outDir);
      clientBuildArtifacts = clientOutputDirectory
        ? await preserveClientBuildArtifacts(clientOutputDirectory)
        : undefined;
      if (!clientBuildArtifacts) {
        clientBuildArtifacts = await preserveClientBuildArtifacts(
          publicationOutputDirectory,
        );
      }
      if (!clientBuildArtifacts) {
        if (await isDirectory(publicationOutputDirectory)) {
          await artifactWriter.copyFrom(publicationOutputDirectory);
        }
        return;
      }
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
      if (config?.mode === "client") return;
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
      const bundleDirectory = join(
        config.root,
        ".riebeckite",
        `ssg-bundle-${randomUUID()}`,
      );

      try {
        await restoreClientBuildArtifacts(outDir, clientBuildArtifacts);
        viteClientAssetPaths = await collectBuildOutputPaths(outDir);
        logSsgDiagnostics(
          this,
          `SSR noExternal=${formatSsrNoExternal()} · client manifest ${clientBuildArtifacts ? "restored" : "not found"}`,
        );
        const { app, module } = await measure(timingsMs, "ssrModuleLoad", () =>
          loadStandaloneSsgBundle({
            root: config.root,
            entry,
            outputDirectory: bundleDirectory,
            clientOutputDirectory: outDir,
            config,
          }),
        );

        const outputChangeSet = await measure<SsgOutputChangeSet | undefined>(
          timingsMs,
          "outputDependencyResolution",
          async () => module.content?.getOutputChangeSet(),
        );
        const appFingerprint = await measure(timingsMs, "appFingerprint", () =>
          computeAppFingerprint(config.root, config.configFile),
        );
        const bundleFingerprint = await measure(
          timingsMs,
          "bundleFingerprint",
          () => computeBundleFingerprint(config.root, config.configFile),
        );
        const outputCachePath = join(
          config.root,
          ".riebeckite",
          "ssg-output-cache.json",
        );
        let previousOutputCache = await loadOutputCacheMetadata(
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
        let outputCacheDecision: OutputCacheDecision = {
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
        let outputCacheRejectionReason =
          decideOutputCacheRejection(outputCacheDecision);
        if (
          outputCacheRejectionReason === undefined &&
          previousOutputCache &&
          !(await validateOutputCache(
            previousOutputCache,
            outputCachePath,
            timingsMs,
            (message) => this.warn(message),
          ))
        ) {
          previousOutputCache = undefined;
          outputCacheDecision = {
            ...outputCacheDecision,
            outputCacheLoaded: false,
          };
          outputCacheRejectionReason =
            decideOutputCacheRejection(outputCacheDecision);
        }
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
          bundleFingerprint,
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
        const result = await measure(timingsMs, "toSSG", () =>
          runSsg({
            app,
            outDir,
            incremental: canUseIncremental,
            plugins: options.plugins,
            extensionMap: options.extensionMap,
            ...(options.concurrency === undefined
              ? {}
              : { concurrency: options.concurrency }),
            write: async (filePath, data) => {
              const fileName = relative(outDir, filePath).replaceAll("\\", "/");
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
              if (!artifactWriter) {
                throw new Error(
                  "Riebeckite SSG artifact writer was not initialized.",
                );
              }
              const writer = artifactWriter;
              await measure(timingsMs, "outputWrite", () =>
                writer.write(fileName, data),
              );
              outputChecksums.set(fileName, fingerprintOutputContent(data));
              metrics.emittedOutputCount += 1;
              nextOutputCache.outputs[fileName] = {
                cachePath: "",
                checksum: "",
              };
            },
          }),
        );
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
              async (asset) => {
                if (!artifactWriter) {
                  throw new Error(
                    "Riebeckite SSG artifact writer was not initialized.",
                  );
                }
                const writer = artifactWriter;
                await measure(timingsMs, "outputWrite", () =>
                  writer.write(asset.fileName, asset.source),
                );
                outputChecksums.set(
                  asset.fileName,
                  fingerprintOutputContent(asset.source),
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
              if (!artifactWriter) {
                throw new Error(
                  "Riebeckite SSG artifact writer was not initialized.",
                );
              }
              const writer = artifactWriter;
              await measure(timingsMs, "outputWrite", () =>
                writer.copyFileFrom(
                  resolveOutputCacheEntryPath(outputCachePath, cached),
                  path,
                ),
              );
              outputChecksums.set(path, cached.checksum);
              metrics.emittedOutputCount += 1;
              metrics.reusedOutputCount += 1;
              nextOutputCache.outputs[path] = cached;
            }
          });
        }
        if (outputChangeSet) {
          for (const output of outputChangeSet.removed) {
            if (siteOwnedOutputPaths.has(output.path)) continue;
            if (!artifactWriter) {
              throw new Error(
                "Riebeckite SSG artifact writer was not initialized.",
              );
            }
            await artifactWriter.remove(output.path);
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
        const manifest = await module.content?.getManifest();
        const publicationFingerprint = manifest
          ? fingerprintPublication(
              publicationEntriesFromManifest(manifest),
              publicationRedirectsFromManifest(manifest),
              publicationOutputsFromManifest(manifest),
            )
          : undefined;
        pendingOutputCache = {
          path: outputCachePath,
          state: nextOutputCache,
          metrics,
          timingsMs,
          outDir,
          publicDir: config.publicDir,
          configFile: config.configFile,
          ...(publicationFingerprint === undefined
            ? {}
            : { publicationFingerprint }),
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
          provenance: module.content?.getProvenance(),
          content: module.content,
          reusablePaths: new Set(
            [...reusablePaths].filter(
              (path) => !siteOwnedOutputPaths.has(path),
            ),
          ),
        };
        this.info(
          `SSG outputs: ${metrics.renderedOutputCount} rendered · ${metrics.reusedOutputCount} reused · ${metrics.deletedOutputCount} removed`,
        );
        const generatedHtmlDiagnostics = inspectGeneratedHtmlPages(
          module,
          generatedHtml,
          {
            warn: (message) => this.warn(message),
            info: (message) => this.info(message),
          },
        );
        module.content?.recordFinalHtmlDiagnostics?.(generatedHtmlDiagnostics);
        logGeneratedHtmlAssetDiagnostics(this, generatedHtml);
      } finally {
        await rm(bundleDirectory, { recursive: true, force: true });
        await discardClientBuildArtifacts(clientBuildArtifacts);
        if (clientOutputDirectory) {
          await rm(clientOutputDirectory, { recursive: true, force: true });
        }
        clientBuildArtifacts = undefined;
      }
    },
    closeBundle: {
      order: "post",
      async handler() {
        if (!resolvedConfig) return;
        if (resolvedConfig.mode === "client") return;
        const outputDirectory = publicationOutputDirectory;
        if (!outputDirectory) {
          throw new Error(
            "Riebeckite SSG could not resolve the publication output directory.",
          );
        }

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
        let published = false;
        try {
          if (!artifactWriter) {
            throw new Error(
              "Riebeckite SSG artifact writer was not initialized.",
            );
          }
          outputCache.state.finalOutputInventory = await measure(
            outputCache.timingsMs,
            "outputInventory",
            () =>
              fingerprintOutputDirectory(
                outputCache.outDir,
                "",
                undefined,
                outputChecksums,
              ),
          );
          const finalOutputInventory = outputCache.state.finalOutputInventory;
          const artifactFingerprint =
            fingerprintOutputInventory(finalOutputInventory);
          if (outputCache.provenance && outputCache.content) {
            await outputCache.content.attachFinalOutputArtifacts(
              outputCache.provenance.buildId,
              finalOutputInventory,
              outputCache.reusablePaths,
            );
          }
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
          assertRequiredOutputsWereGenerated(outputPlanComparison);
          const publicDir = outputCache.publicDir;
          outputCache.state.publicDirectory = publicDir
            ? resolve(publicDir)
            : undefined;
          outputCache.state.publicFingerprint = publicDir
            ? await measure(outputCache.timingsMs, "publicFingerprint", () =>
                fingerprintDirectory(resolve(publicDir)),
              )
            : undefined;
          try {
            await saveOutputCache(
              outputCache.path,
              outputCache.state,
              outputCache.outDir,
              outputCache.timingsMs,
            );
          } catch (error) {
            this.warn(
              `SSG output cache could not be saved; the next build regenerates every output. ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
          await artifactWriter.publish();
          published = true;
          await writePublicationMarker({
            root: resolvedConfig.root,
            outputDirectory,
            publicationFingerprint: outputCache.publicationFingerprint,
            artifactFingerprint,
            warn: (message) => this.warn(message),
          });
        } finally {
          if (!published) await artifactWriter?.discard();
          await writeSsgOutputMetrics(outputCache.metrics);
          pendingOutputCache = undefined;
          artifactWriter = undefined;
        }
      },
    },
    async buildEnd(error) {
      if (!error || !artifactWriter) return;
      await artifactWriter.discard();
      artifactWriter = undefined;
      pendingOutputCache = undefined;
    },
  };
}
export function shouldApplyRiebeckiteSsg(
  _config: unknown,
  env: ConfigEnv,
): boolean {
  return (
    env.command === "build" &&
    env.mode !== "client" &&
    !isStandaloneSsgMode(env.mode)
  );
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await lstat(path)).isDirectory();
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "ENOENT"
    ) {
      return false;
    }
    throw error;
  }
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

export function assertRequiredOutputsWereGenerated(comparison: {
  readonly missingInDist: readonly string[];
}): void {
  if (comparison.missingInDist.length === 0) return;
  throw new Error(
    `SSG did not generate required output: ${comparison.missingInDist.join(", ")}`,
  );
}

async function emitGeneratedOutputs(
  module: SsgModule,
  emit: (asset: GeneratedOutputAsset) => Promise<void>,
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
    const source = isDeferredGeneratedOutput(output)
      ? await output.generate()
      : output.content;
    await emit({
      type: "asset",
      fileName: output.path,
      source,
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

async function writePublicationMarker(input: {
  readonly root: string;
  readonly outputDirectory: string;
  readonly publicationFingerprint?: string;
  readonly artifactFingerprint?: string;
  readonly warn: (message: string) => void;
}): Promise<void> {
  const path = join(input.root, ".riebeckite", BUILD_OUTPUT_MARKER_FILE);
  try {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(
      path,
      serializeBuildOutputMarker(
        createBuildOutputMarker({
          outputDirectory: input.outputDirectory,
          ...(input.publicationFingerprint === undefined
            ? {}
            : { publicationFingerprint: input.publicationFingerprint }),
          ...(input.artifactFingerprint === undefined
            ? {}
            : { artifactFingerprint: input.artifactFingerprint }),
          completedAt: new Date(),
        }),
      ),
      "utf8",
    );
  } catch (error) {
    input.warn(
      `Could not write the publication marker; publish will rebuild before deploying. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
