import type { Observability } from "../observability.js";
import type { Pipeline, PipelineOptions } from "../pipeline.js";
import type {
  ManifestHookMetrics,
  PluginRuntime,
} from "../plugin/plugin_runtime.js";
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
import type { ContentBuildCoordinator } from "./content_build_coordinator.js";
import type {
  ContentBuildPlan,
  FullRegenerationReason,
} from "./content_build_plan.js";
import type { ContentBuildSession } from "./content_build_session.js";
import type { CachedContentDependency } from "./content_dependency_tracker.js";
import type { ContentEntryReader } from "./content_entry_reader.js";
import type { ContentFormatRegistry } from "./content_format.js";
import type { ContentGraph } from "./content_graph.js";
import type {
  ContentIndexBuild,
  ContentIndexBuilder,
} from "./content_index_builder.js";
import type { ContentLocationResolver } from "./content_location_resolver.js";
import type {
  Backlink,
  CompletedContentBuildSnapshot,
  ContentBuildOptions,
  ContentInspection,
  ContentPostReference,
  PublicAssetReferences,
} from "./content_manager_shared.js";
import type { ContentOutputResolver } from "./content_output_resolver.js";
import type { ContentSource, ContentSourceEntry } from "./content_source.js";
import type { ManifestAssembler } from "./manifest_assembler.js";
import type { OutputChangeSet } from "./output_dependency.js";

export interface ContentManagerContext {
  pipelineOptions: PipelineOptions;
  source: ContentSource;
  contentIndexBuilder: ContentIndexBuilder;
  manifestAssembler: ManifestAssembler;
  pluginRuntime: PluginRuntime;
  contentIndex: Map<string, string> | null;
  contentIndexAmbiguities: ReadonlyMap<string, readonly string[]>;
  contentIndexPromise: Promise<ContentIndexBuild> | null;
  contentCache: Map<string, PostContent>;
  manifest: ContentManifest | null;
  manifestPromise: Promise<ContentManifest> | null;
  routeManifest: ContentManifest | null;
  routeManifestPromise: Promise<ContentManifest> | null;
  pipelineFingerprint: string | null;
  pipeline: Pipeline | null;
  pipelinePromise: Promise<Pipeline> | null;
  entryReader: ContentEntryReader;
  locationResolver: ContentLocationResolver;
  buildCoordinator: ContentBuildCoordinator;
  outputResolver: ContentOutputResolver;
  isBuildTime: boolean;
  publishingBuildTime: Date;
  routableSlugs: Set<string> | null;
  routableSlugsPromise: Promise<Set<string>> | null;
  processedContentCount: number;
  reusedContentCount: number;
  outputChangeSet: OutputChangeSet | null;
  completedBuildSnapshot: CompletedContentBuildSnapshot | null;
  finalHtmlDiagnostics: Diagnostic[];
  buildSession: ContentBuildSession;
  buildStateCommitRequested: boolean;
  buildStateCommitted: boolean;
  cacheManifestEntries: readonly ContentManifestEntry[];
  trackedContentDependencies: Map<string, readonly CachedContentDependency[]>;
  processedContentCacheFingerprints: Map<string, string | undefined>;
  processedContentDurations: Map<string, number>;
  provenance: BuildProvenance | undefined;
  formats: ContentFormatRegistry;
  contentPathIndex:
    | {
        entries: readonly ContentSourceEntry[];
        bySlug: Map<string, string[]>;
      }
    | undefined;
  getAllPosts(): Promise<ContentPostReference[]>;
  scan(): Promise<readonly ContentSourceEntry[]>;
  getContentDependencies(): Promise<ReadonlyMap<string, readonly string[]>>;
  getPost(slug: string): Promise<string>;
  getContentPaths(): Promise<Map<string, string[]>>;
  getContentPath(slug: string): Promise<string>;
  getPublicAssetReferences(): Promise<PublicAssetReferences>;
  getContentIndex(plan?: ContentBuildPlan): Promise<Map<string, string>>;
  getProcessedContent(slug: string): Promise<PostContent>;
  processContent(slug: string): Promise<PostContent>;
  getManifest(options?: ContentBuildOptions): Promise<ContentManifest>;
  getRouteManifest(): Promise<ContentManifest>;
  getRequestManifest(): Promise<ContentManifest>;
  buildRouteManifest(): Promise<ContentManifest>;
  buildManifest(options?: ContentBuildOptions): Promise<ContentManifest>;
  collectManifestEntries(
    plan: ContentBuildPlan,
    locations: ReadonlyMap<string, ContentPublicLocation>,
  ): Promise<{
    contentIndex: Map<string, string>;
    entries: ContentManifestEntry[];
  }>;
  assembleManifest(
    entries: ContentManifestEntry[],
    contentIndex: Map<string, string>,
    locations: ReadonlyMap<string, ContentPublicLocation>,
    plan: ContentBuildPlan,
  ): Promise<{
    manifest: ContentManifest;
    cacheManifestEntries: readonly ContentManifestEntry[];
  }>;
  finalizeManifestOutputs(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
    plan: ContentBuildPlan,
  ): Promise<OutputChangeSet>;
  recordCompletedBuild(
    manifest: ContentManifest,
    plan: ContentBuildPlan,
    cacheManifestEntries: readonly ContentManifestEntry[],
    startedAt: number,
    outputChangeSet: OutputChangeSet,
  ): Promise<void>;
  build(options?: ContentBuildOptions): Promise<ContentManifest>;
  getProcessedContentCount(): number;
  getReusedContentCount(): number;
  getManifestHookMetrics(): ManifestHookMetrics;
  getCompletedBuildSnapshot(): CompletedContentBuildSnapshot | undefined;
  recordFinalHtmlDiagnostics(diagnostics: readonly Diagnostic[]): void;
  getProvenance(): BuildProvenance | undefined;
  attachFinalOutputArtifacts(
    buildId: string,
    fingerprints: Readonly<Record<string, string>>,
    cacheHits: ReadonlySet<string>,
  ): Promise<void>;
  getNoChangeFastPathBlockReason(
    options?: ContentBuildOptions,
  ): Promise<string | undefined>;
  getFullRegenerationReasons(): Promise<readonly FullRegenerationReason[]>;
  getOutputChangeSet(options?: ContentBuildOptions): Promise<OutputChangeSet>;
  getBacklinks(targetSlug: string): Promise<Backlink[]>;
  getContentGraph(): Promise<ContentGraph>;
  getDiagnostics(): Promise<Diagnostic[]>;
  resolvePage(pathname: string): Promise<ResolvedPluginPage | null>;
  getPagePaths(): Promise<readonly string[]>;
  inspect(): Promise<ContentInspection>;
  dispose(): Promise<void>;
  getContentLocations(): Promise<ReadonlyMap<string, ContentPublicLocation>>;
  publishStrategy(): PublishStrategy;
  reuseManifestEntry(
    slug: string,
    sourcePath: string,
    source: string,
    plan: ContentBuildPlan,
  ): ContentManifestEntry | null;
  getPipelineFingerprint(): string | undefined;
  requestBuildStateCommit(options?: ContentBuildOptions): void;
  commitBuildState(): Promise<void>;
  getBuildPlan(options?: ContentBuildOptions): Promise<ContentBuildPlan>;
  computePipelineFingerprint(
    locations?: ReadonlyMap<string, ContentPublicLocation>,
  ): string;
  requiresFullContentRegeneration(): boolean;
  getProcessedContentCacheFingerprint(
    slug: string,
    source: string,
  ): string | undefined;
  isRoutable(slug: string): boolean;
  ensureRoutableSlugs(): Promise<Set<string>>;
  resolveRoutableSlugs(): Promise<Set<string>>;
  getPipeline(): Promise<Pipeline>;
  createPipeline(): Promise<Pipeline>;
  enableBuildTime(): void;
  emitPublicImageAssets(manifest: ContentManifest): Promise<void>;
  observability(): Observability;
}
