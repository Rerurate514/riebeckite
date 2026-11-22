import type { Observability } from "../observability.js";
import type { Pipeline, PipelineOptions } from "../pipeline.js";
import type { ManifestHookMetrics } from "../plugin/plugin_runtime.js";
import type { BuildProvenance } from "../provenance/provenance.js";
import type {
  ContentManifest,
  ContentManifestEntry,
  ContentPublicLocation,
} from "../types/content_manifest.js";
import type { Diagnostic } from "../types/diagnostic.js";
import type { ResolvedPluginPage } from "../types/plugin_page.js";
import type { PostContent } from "../types/post_content.js";
import type { PublishStrategy } from "../types/publish_strategy.js";
import type { ResolvedRiebeckiteConfig } from "../types/resolved_riebeckite_config.js";
import type {
  ContentBuildPlan,
  FullRegenerationReason,
} from "./content_build_plan.js";
import type { ContentGraph } from "./content_graph.js";
import {
  assembleManifestImpl,
  collectManifestEntriesImpl,
  finalizeManifestOutputsImpl,
  recordCompletedBuildImpl,
} from "./content_manager_assemble.js";
import {
  buildImpl,
  commitBuildStateImpl,
  computePipelineFingerprintImpl,
  createPipelineImpl,
  enableBuildTimeImpl,
  getBuildPlanImpl,
  getFullRegenerationReasonsImpl,
  getNoChangeFastPathBlockReasonImpl,
  getOutputChangeSetImpl,
  getPipelineFingerprintImpl,
  getPipelineImpl,
  requestBuildStateCommitImpl,
  requiresFullContentRegenerationImpl,
} from "./content_manager_build.js";
import {
  attachFinalOutputArtifactsImpl,
  emitPublicImageAssetsImpl,
  ensureRoutableSlugsImpl,
  getCompletedBuildSnapshotImpl,
  getManifestHookMetricsImpl,
  getProcessedContentCacheFingerprintImpl,
  getProcessedContentCountImpl,
  getProvenanceImpl,
  getReusedContentCountImpl,
  isRoutableImpl,
  observabilityImpl,
  recordFinalHtmlDiagnosticsImpl,
  resolveRoutableSlugsImpl,
  reuseManifestEntryImpl,
} from "./content_manager_cache.js";
import { asContentManagerContext } from "./content_manager_context.js";
import {
  disposeImpl,
  getBacklinksImpl,
  getContentGraphImpl,
  getContentLocationsImpl,
  getDiagnosticsImpl,
  getPagePathsImpl,
  getPublicAssetReferencesImpl,
  inspectImpl,
  publishStrategyImpl,
  resolvePageImpl,
} from "./content_manager_inspect.js";
import {
  buildManifestImpl,
  buildRouteManifestImpl,
  getManifestImpl,
  getRequestManifestImpl,
  getRouteManifestImpl,
} from "./content_manager_manifest.js";
import {
  getAllPostsImpl,
  getContentDependenciesImpl,
  getContentIndexImpl,
  getContentPathImpl,
  getContentPathsImpl,
  getPostImpl,
  getProcessedContentImpl,
  processContentImpl,
  scanImpl,
} from "./content_manager_query.js";
import type {
  Backlink,
  CompletedContentBuildSnapshot,
  ContentBuildOptions,
  ContentInspection,
  ContentPostReference,
  PublicAssetReferences,
} from "./content_manager_shared.js";
import { initializeContentManager } from "./content_manager_state.js";
import type { ContentSource, ContentSourceEntry } from "./content_source.js";
import type { OutputChangeSet } from "./output_dependency.js";

export class ContentManager {
  getAllPosts = async (): Promise<ContentPostReference[]> =>
    await getAllPostsImpl(asContentManagerContext(this));
  scan = async (): Promise<readonly ContentSourceEntry[]> =>
    await scanImpl(asContentManagerContext(this));
  getContentDependencies = async (): Promise<
    ReadonlyMap<string, readonly string[]>
  > => await getContentDependenciesImpl(asContentManagerContext(this));
  getPost = async (slug: string): Promise<string> =>
    await getPostImpl(asContentManagerContext(this), slug);
  getContentPaths = async (): Promise<Map<string, string[]>> =>
    await getContentPathsImpl(asContentManagerContext(this));
  getContentPath = async (slug: string): Promise<string> =>
    await getContentPathImpl(asContentManagerContext(this), slug);
  getPublicAssetReferences = async (): Promise<PublicAssetReferences> =>
    await getPublicAssetReferencesImpl(asContentManagerContext(this));
  getContentIndex = async (
    plan?: ContentBuildPlan,
  ): Promise<Map<string, string>> =>
    await getContentIndexImpl(asContentManagerContext(this), plan);
  getProcessedContent = async (slug: string): Promise<PostContent> =>
    await getProcessedContentImpl(asContentManagerContext(this), slug);
  processContent = async (slug: string): Promise<PostContent> =>
    await processContentImpl(asContentManagerContext(this), slug);
  getManifest = async (
    options?: ContentBuildOptions,
  ): Promise<ContentManifest> =>
    await getManifestImpl(asContentManagerContext(this), options);
  getRouteManifest = async (): Promise<ContentManifest> =>
    await getRouteManifestImpl(asContentManagerContext(this));
  getRequestManifest = async (): Promise<ContentManifest> =>
    await getRequestManifestImpl(asContentManagerContext(this));
  buildRouteManifest = async (): Promise<ContentManifest> =>
    await buildRouteManifestImpl(asContentManagerContext(this));
  buildManifest = async (
    options?: ContentBuildOptions,
  ): Promise<ContentManifest> =>
    await buildManifestImpl(asContentManagerContext(this), options);
  collectManifestEntries = async (
    plan: ContentBuildPlan,
    locations: ReadonlyMap<string, ContentPublicLocation>,
  ): Promise<{
    contentIndex: Map<string, string>;
    entries: ContentManifestEntry[];
  }> =>
    await collectManifestEntriesImpl(
      asContentManagerContext(this),
      plan,
      locations,
    );
  assembleManifest = async (
    entries: ContentManifestEntry[],
    contentIndex: Map<string, string>,
    locations: ReadonlyMap<string, ContentPublicLocation>,
    plan: ContentBuildPlan,
  ): Promise<{
    manifest: ContentManifest;
    cacheManifestEntries: readonly ContentManifestEntry[];
  }> =>
    await assembleManifestImpl(
      asContentManagerContext(this),
      entries,
      contentIndex,
      locations,
      plan,
    );
  finalizeManifestOutputs = async (
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
    plan: ContentBuildPlan,
  ): Promise<OutputChangeSet> =>
    await finalizeManifestOutputsImpl(
      asContentManagerContext(this),
      manifest,
      contentIndex,
      plan,
    );
  recordCompletedBuild = async (
    manifest: ContentManifest,
    plan: ContentBuildPlan,
    cacheManifestEntries: readonly ContentManifestEntry[],
    startedAt: number,
    outputChangeSet: OutputChangeSet,
  ): Promise<void> =>
    await recordCompletedBuildImpl(
      asContentManagerContext(this),
      manifest,
      plan,
      cacheManifestEntries,
      startedAt,
      outputChangeSet,
    );
  build = async (options: ContentBuildOptions = {}): Promise<ContentManifest> =>
    await buildImpl(asContentManagerContext(this), options);
  getProcessedContentCount = (): number =>
    getProcessedContentCountImpl(asContentManagerContext(this));
  getReusedContentCount = (): number =>
    getReusedContentCountImpl(asContentManagerContext(this));
  getManifestHookMetrics = (): ManifestHookMetrics =>
    getManifestHookMetricsImpl(asContentManagerContext(this));
  getCompletedBuildSnapshot = (): CompletedContentBuildSnapshot | undefined =>
    getCompletedBuildSnapshotImpl(asContentManagerContext(this));
  recordFinalHtmlDiagnostics = (diagnostics: readonly Diagnostic[]): void =>
    recordFinalHtmlDiagnosticsImpl(asContentManagerContext(this), diagnostics);
  getProvenance = (): BuildProvenance | undefined =>
    getProvenanceImpl(asContentManagerContext(this));
  attachFinalOutputArtifacts = async (
    buildId: string,
    fingerprints: Readonly<Record<string, string>>,
    cacheHits: ReadonlySet<string>,
  ): Promise<void> =>
    await attachFinalOutputArtifactsImpl(
      asContentManagerContext(this),
      buildId,
      fingerprints,
      cacheHits,
    );
  getNoChangeFastPathBlockReason = async (
    options: ContentBuildOptions = {},
  ): Promise<string | undefined> =>
    await getNoChangeFastPathBlockReasonImpl(
      asContentManagerContext(this),
      options,
    );
  getFullRegenerationReasons = async (): Promise<
    readonly FullRegenerationReason[]
  > => await getFullRegenerationReasonsImpl(asContentManagerContext(this));
  getOutputChangeSet = async (
    options: ContentBuildOptions = {},
  ): Promise<OutputChangeSet> =>
    await getOutputChangeSetImpl(asContentManagerContext(this), options);
  getBacklinks = async (targetSlug: string): Promise<Backlink[]> =>
    await getBacklinksImpl(asContentManagerContext(this), targetSlug);
  getContentGraph = async (): Promise<ContentGraph> =>
    await getContentGraphImpl(asContentManagerContext(this));
  getDiagnostics = async (): Promise<Diagnostic[]> =>
    await getDiagnosticsImpl(asContentManagerContext(this));
  resolvePage = async (pathname: string): Promise<ResolvedPluginPage | null> =>
    await resolvePageImpl(asContentManagerContext(this), pathname);
  getPagePaths = async (): Promise<readonly string[]> =>
    await getPagePathsImpl(asContentManagerContext(this));
  inspect = async (): Promise<ContentInspection> =>
    await inspectImpl(asContentManagerContext(this));
  dispose = async (): Promise<void> =>
    await disposeImpl(asContentManagerContext(this));
  getContentLocations = async (): Promise<
    ReadonlyMap<string, ContentPublicLocation>
  > => await getContentLocationsImpl(asContentManagerContext(this));
  publishStrategy = (): PublishStrategy =>
    publishStrategyImpl(asContentManagerContext(this));
  reuseManifestEntry = (
    slug: string,
    sourcePath: string,
    source: string,
    plan: ContentBuildPlan,
  ): ContentManifestEntry | null =>
    reuseManifestEntryImpl(
      asContentManagerContext(this),
      slug,
      sourcePath,
      source,
      plan,
    );
  getPipelineFingerprint = (): string | undefined =>
    getPipelineFingerprintImpl(asContentManagerContext(this));
  requestBuildStateCommit = (options?: ContentBuildOptions): void =>
    requestBuildStateCommitImpl(asContentManagerContext(this), options);
  commitBuildState = async (): Promise<void> =>
    await commitBuildStateImpl(asContentManagerContext(this));
  getBuildPlan = (options?: ContentBuildOptions): Promise<ContentBuildPlan> =>
    getBuildPlanImpl(asContentManagerContext(this), options);
  computePipelineFingerprint = (
    locations?: ReadonlyMap<string, ContentPublicLocation>,
  ): string =>
    computePipelineFingerprintImpl(asContentManagerContext(this), locations);
  requiresFullContentRegeneration = (): boolean =>
    requiresFullContentRegenerationImpl(asContentManagerContext(this));
  getProcessedContentCacheFingerprint = (
    slug: string,
    source: string,
  ): string | undefined =>
    getProcessedContentCacheFingerprintImpl(
      asContentManagerContext(this),
      slug,
      source,
    );
  isRoutable = (slug: string): boolean =>
    isRoutableImpl(asContentManagerContext(this), slug);
  ensureRoutableSlugs = async (): Promise<Set<string>> =>
    await ensureRoutableSlugsImpl(asContentManagerContext(this));
  resolveRoutableSlugs = async (): Promise<Set<string>> =>
    await resolveRoutableSlugsImpl(asContentManagerContext(this));
  getPipeline = async (): Promise<Pipeline> =>
    await getPipelineImpl(asContentManagerContext(this));
  createPipeline = async (): Promise<Pipeline> =>
    await createPipelineImpl(asContentManagerContext(this));
  enableBuildTime = (): void =>
    enableBuildTimeImpl(asContentManagerContext(this));
  emitPublicImageAssets = async (manifest: ContentManifest): Promise<void> =>
    await emitPublicImageAssetsImpl(asContentManagerContext(this), manifest);
  observability = (): Observability =>
    observabilityImpl(asContentManagerContext(this));

  constructor(
    content: ContentSource,
    _exclude: string[] = [],
    pipelineOptions: PipelineOptions = {},
  ) {
    initializeContentManager(
      asContentManagerContext(this),
      content,
      _exclude,
      pipelineOptions,
    );
  }
}

declare module "../pipeline" {
  interface PipelineOptions {
    config?: ResolvedRiebeckiteConfig;
    publishingBuildTime?: Date | string;
    commitBuildState?: boolean;
  }
}

export type {
  CompletedContentBuildSnapshot,
  ContentBuildOptions,
  ContentInspection,
  PublicAssetReferences,
} from "./content_manager_shared.js";
