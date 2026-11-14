import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import type { ResolvedConfig } from "vite";
import { collectSiteOwnedOutputPaths } from "./content_assets.js";
import {
  collectBuildOutputPaths,
  restoreClientBuildArtifacts,
} from "./ssg/build_output.js";
import { formatSsrNoExternal, logSsgDiagnostics } from "./ssg/diagnostics.js";
import {
  computeAppFingerprint,
  computeBundleFingerprint,
} from "./ssg/inventory.js";
import {
  decideOutputCacheRejection,
  loadOutputCacheMetadata,
  type OutputCacheState,
  validateOutputCache,
} from "./ssg/output_cache.js";
import { measure } from "./ssg/runtime_metrics.js";
import { loadStandaloneSsgBundle } from "./ssg/standalone.js";
import type {
  OutputCacheDecision,
  SsgOutputChangeSet,
  SsgOutputMetrics,
} from "./ssg/types.js";
import {
  findBuildOutputSiteCollisions,
  isDirectory,
  removeVirtualEntryChunk,
} from "./ssg_plugin_helpers.js";
import type { SsgPluginLogger, SsgPluginState } from "./ssg_plugin_state.js";

export async function prepareSsgGeneration(
  plugin: SsgPluginLogger,
  state: SsgPluginState,
  bundle: Record<
    string,
    { type: string; fileName: string; moduleIds?: string[] }
  >,
) {
  const config = state.resolvedConfig as ResolvedConfig;
  const timingsMs: Record<string, number> | undefined = process.env
    .RIEBECKITE_SSG_METRICS_FILE
    ? {}
    : undefined;
  const outDir = resolve(config.root, config.build.outDir);
  let viteClientAssetPaths: string[] = [];
  removeVirtualEntryChunk(bundle, state.resolvedVirtualId);
  const bundleDirectory = join(
    config.root,
    ".riebeckite",
    `ssg-bundle-${randomUUID()}`,
  );

  await restoreClientBuildArtifacts(outDir, state.clientBuildArtifacts);
  viteClientAssetPaths = await collectBuildOutputPaths(outDir);
  logSsgDiagnostics(
    plugin,
    `SSR noExternal=${formatSsrNoExternal()} · client manifest ${state.clientBuildArtifacts ? "restored" : "not found"}`,
  );
  const { app, module } = await measure(timingsMs, "ssrModuleLoad", () =>
    loadStandaloneSsgBundle({
      root: config.root,
      entry: state.entry,
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
  const previousOutputDirectory = state.publicationOutputDirectory;
  if (
    !state.clientBuildArtifacts &&
    state.artifactWriter &&
    previousOutputDirectory &&
    (await isDirectory(previousOutputDirectory))
  ) {
    await state.artifactWriter.copyFrom(previousOutputDirectory);
  }
  const appFingerprint = await measure(timingsMs, "appFingerprint", () =>
    computeAppFingerprint(config.root, config.configFile),
  );
  const bundleFingerprint = await measure(timingsMs, "bundleFingerprint", () =>
    computeBundleFingerprint(config.root, config.configFile),
  );
  const outputCachePath = join(
    config.root,
    ".riebeckite",
    "ssg-output-cache.json",
  );
  let previousOutputCache = await loadOutputCacheMetadata(
    outputCachePath,
    timingsMs,
    (message) => plugin.warn(message),
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
    plugin.warn(
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
    appFingerprintMatch: previousOutputCache?.appFingerprint === appFingerprint,
    clientManifestFingerprintMatch:
      previousOutputCache?.clientManifestFingerprint ===
      state.clientBuildArtifacts?.manifestFingerprint,
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
      (message) => plugin.warn(message),
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
    plugin,
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
    clientManifestFingerprint: state.clientBuildArtifacts?.manifestFingerprint,
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
  return {
    config,
    timingsMs,
    outDir,
    viteClientAssetPaths,
    bundleDirectory,
    app,
    module,
    outputChangeSet,
    appFingerprint,
    bundleFingerprint,
    outputCachePath,
    previousOutputCache,
    siteOwnedOutputPaths,
    outputCacheDecision,
    outputCacheRejectionReason,
    canUseIncremental,
    reusablePaths,
    inventory,
    inventoryPaths,
    honoStaticRoutePaths,
    shadowedOutputs,
    skippedRouteCount,
    generatedHtml,
    nextOutputCache,
    metrics,
    artifactWriter: state.artifactWriter,
    outputChecksums: state.outputChecksums,
  };
}

export type SsgGeneration = Awaited<ReturnType<typeof prepareSsgGeneration>>;
