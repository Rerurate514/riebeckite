import { finalizeDeferredMarkdownComponents } from "../plugin_component_deferred.js";
import { createBuildProvenance } from "../provenance/provenance.js";
import type {
  ContentManifest,
  ContentManifestEntry,
  ContentPublicLocation,
} from "../types/content_manifest.js";
import type { Diagnostic } from "../types/diagnostic.js";
import { mapConcurrent } from "../utils/concurrency.js";
import type { ContentBuildPlan } from "./content_build_plan.js";
import type { ContentManagerContext } from "./content_manager_context.js";
import {
  CONTENT_PROCESSING_CONCURRENCY,
  freezeManifestHookMetrics,
  freezeOutputChangeSet,
} from "./content_manager_shared.js";
import type { OutputChangeSet } from "./output_dependency.js";
import { resolvePublishingState } from "./publishing.js";

export async function collectManifestEntriesImpl(
  m: ContentManagerContext,
  plan: ContentBuildPlan,
  locations: ReadonlyMap<string, ContentPublicLocation>,
): Promise<{
  contentIndex: Map<string, string>;
  entries: ContentManifestEntry[];
}> {
  const [posts, contentIndex] = await Promise.all([
    m.getAllPosts(),
    m.getContentIndex(plan),
  ]);
  const entriesByPath = new Map(
    (await m.scan()).map((entry) => [entry.path, entry]),
  );
  const entries = await m
    .observability()
    .tracer.span("content.manifest.entries", {}, () =>
      mapConcurrent(posts, CONTENT_PROCESSING_CONCURRENCY, async (post) => {
        const rawPost = await m.getPost(post.slug);
        const sourcePath = await m.getContentPath(post.slug);
        const reused = m.reuseManifestEntry(
          post.slug,
          sourcePath,
          rawPost,
          plan,
        );
        if (reused) return reused;

        const processed = await m.getProcessedContent(post.slug);
        const location = locations.get(post.slug);
        if (!location) {
          throw new Error(
            `Content public location was not resolved: ${post.slug}`,
          );
        }

        return m.manifestAssembler.createEntry(
          post.slug,
          rawPost,
          processed,
          contentIndex,
          location,
          resolvePublishingState(processed.frontmatter, {
            strategy: m.publishStrategy(),
            buildTime: m.publishingBuildTime,
          }),
          processed.sourcePath
            ? entriesByPath.get(processed.sourcePath)?.metadata
            : undefined,
          m.contentIndexAmbiguities,
          processed.sourcePath,
        );
      }),
    );
  return { contentIndex, entries };
}

export async function assembleManifestImpl(
  m: ContentManagerContext,
  entries: ContentManifestEntry[],
  contentIndex: Map<string, string>,
  locations: ReadonlyMap<string, ContentPublicLocation>,
  plan: ContentBuildPlan,
): Promise<{
  manifest: ContentManifest;
  cacheManifestEntries: readonly ContentManifestEntry[];
}> {
  await m.pluginRuntime.runGraphHook(entries, contentIndex);
  const manifest = await m
    .observability()
    .tracer.span("content.graph", {}, () =>
      m.manifestAssembler.build(
        entries,
        contentIndex,
        m.contentIndexAmbiguities,
      ),
    );
  const cacheManifestEntries = structuredClone(manifest.entries);
  m.locationResolver.populateRedirects(manifest, locations);
  m.manifestAssembler.applyPublicView(
    manifest,
    m.publishStrategy(),
    m.publishingBuildTime,
  );
  manifest.localization =
    (await m.pluginRuntime.resolveContentLocalization(
      manifest,
      contentIndex,
    )) ?? manifest.localization;
  manifest.pagePaths = [
    ...(await m.pluginRuntime.getPagePaths(manifest, contentIndex)),
  ];
  await m.outputResolver.populatePageRoutes(manifest, contentIndex);
  await m.pluginRuntime.runAssetTransforms(manifest);
  await m.pluginRuntime.runManifestCreated(
    manifest,
    contentIndex,
    plan.previousState?.manifestHookCache,
    m.getPipelineFingerprint(),
  );
  const deferredDiagnostics: Diagnostic[] = [];
  await finalizeDeferredMarkdownComponents(
    manifest,
    m.pluginRuntime.getMarkdownComponents(),
    deferredDiagnostics,
  );
  m.manifestAssembler.synchronizeHtml(manifest, cacheManifestEntries);
  manifest.assets = m.pluginRuntime.collectAssets();
  manifest.clientEntries = m.pluginRuntime.collectClientEntries();
  manifest.diagnostics = [
    ...deferredDiagnostics,
    ...m.pluginRuntime.getDiagnostics(),
    ...(await m.pluginRuntime.collectDiagnostics(contentIndex)),
  ];
  return { manifest, cacheManifestEntries };
}

export async function finalizeManifestOutputsImpl(
  m: ContentManagerContext,
  manifest: ContentManifest,
  contentIndex: Map<string, string>,
  plan: ContentBuildPlan,
): Promise<OutputChangeSet> {
  await m.pluginRuntime.runGeneratedOutputPlans(manifest);
  await m.pluginRuntime.runBuildEnd(manifest, contentIndex);
  await m.emitPublicImageAssets(manifest);
  manifest.generatedOutputs = m.pluginRuntime.collectGeneratedOutputs();
  const outputChangeSet = await m.outputResolver.resolve({
    manifest,
    contentIndex,
    previousState: plan.previousState,
    changeSet: plan.changeSet,
    affectedContent: plan.affectedContent,
    externalDependencies: plan.externalDependencies,
    externalDependencyFailures: plan.externalDependencyFailures,
    contentFingerprints: m.processedContentCacheFingerprints,
  });
  m.outputChangeSet = outputChangeSet;
  m.observability().tracer.event("build.incremental.outputs", {
    candidateOutputCount: outputChangeSet.candidateOutputCount,
    affectedOutputCount: outputChangeSet.affectedOutputCount,
    removedOutputCount: outputChangeSet.removedOutputCount,
    unchangedOutputCount: outputChangeSet.unchangedOutputCount,
    fullRegenerationRequired: outputChangeSet.fullRegenerationRequired,
  });
  return outputChangeSet;
}

export async function recordCompletedBuildImpl(
  m: ContentManagerContext,
  manifest: ContentManifest,
  plan: ContentBuildPlan,
  cacheManifestEntries: readonly ContentManifestEntry[],
  startedAt: number,
  outputChangeSet: OutputChangeSet,
): Promise<void> {
  m.manifest = manifest;
  m.cacheManifestEntries = cacheManifestEntries;
  m.provenance = undefined;
  if (m.pipelineOptions.config?.provenance?.enabled !== false) {
    try {
      m.provenance = createBuildProvenance({
        plan,
        manifest,
        outputChanges: outputChangeSet,
        pluginHooks: m.pluginRuntime.getPluginHookExecutions(),
        derivedViews: m.pluginRuntime.getDerivedViewInspection(),
        processed: m.processedContentDurations,
        isContentPath: (path) => m.formats.isContentPath(path),
        toSlug: (path) => m.formats.toSlug(path),
      });
    } catch {
      m.provenance = undefined;
      m.observability().logger.warn("Could not record build provenance.");
    }
  }
  await m.commitBuildState();
  m.finalHtmlDiagnostics = [];
  const inspectorTabs = Object.freeze(
    m.pipelineOptions.isDevelopment
      ? (await m.pluginRuntime.collectInspectorTabs()).map((tab) =>
          Object.freeze({ ...tab }),
        )
      : [],
  );
  m.completedBuildSnapshot = Object.freeze({
    manifest,
    outputChangeSet: freezeOutputChangeSet(outputChangeSet),
    fullRegenerationReasons: Object.freeze([...plan.fullRegenerationReasons]),
    completedAt: Date.now(),
    startedAt,
    plugins: Object.freeze(
      m.pluginRuntime.getPluginInventory().map((plugin) =>
        Object.freeze({
          ...plugin,
          provides: Object.freeze([...plugin.provides]),
          requires: Object.freeze([...plugin.requires]),
          optional: Object.freeze([...plugin.optional]),
        }),
      ),
    ),
    manifestHookMetrics: freezeManifestHookMetrics(
      m.pluginRuntime.getManifestHookMetrics(),
    ),
    derivedViews: Object.freeze(
      m.pluginRuntime.getDerivedViewInspection().map((view) =>
        Object.freeze({
          ...view,
          dependencies: Object.freeze([...view.dependencies]),
          outputPaths: Object.freeze([...view.outputPaths]),
        }),
      ),
    ),
    inspectorTabs,
    finalHtmlDiagnostics: m.finalHtmlDiagnostics,
    ...(m.provenance === undefined ? {} : { provenance: m.provenance }),
    trace: m.pipelineOptions.traceRecorder?.snapshot(),
  });
}
