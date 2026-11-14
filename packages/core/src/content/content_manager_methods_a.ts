import type { ManifestHookMetrics } from "../plugin/plugin_runtime.js";
import type { BuildProvenance } from "../provenance/provenance.js";
import type {
  ContentManifest,
  ContentManifestEntry,
  ContentPublicLocation,
} from "../types/content_manifest.js";
import type { Diagnostic } from "../types/diagnostic.js";
import type { PostContent } from "../types/post_content.js";
import type {
  ContentBuildPlan,
  FullRegenerationReason,
} from "./content_build_plan.js";
import {
  assembleManifestImpl,
  collectManifestEntriesImpl,
  finalizeManifestOutputsImpl,
  recordCompletedBuildImpl,
} from "./content_manager_assemble.js";
import {
  buildImpl,
  getFullRegenerationReasonsImpl,
  getNoChangeFastPathBlockReasonImpl,
  getOutputChangeSetImpl,
} from "./content_manager_build.js";
import {
  attachFinalOutputArtifactsImpl,
  getCompletedBuildSnapshotImpl,
  getManifestHookMetricsImpl,
  getProcessedContentCountImpl,
  getProvenanceImpl,
  getReusedContentCountImpl,
  recordFinalHtmlDiagnosticsImpl,
} from "./content_manager_cache.js";
import type { ContentManagerContext } from "./content_manager_context.js";
import {
  getBacklinksImpl,
  getPublicAssetReferencesImpl,
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
  ContentPostReference,
  PublicAssetReferences,
} from "./content_manager_shared.js";
import type { ContentSourceEntry } from "./content_source.js";
import type { OutputChangeSet } from "./output_dependency.js";

export class ContentManagerMethodsA {
  getAllPosts = async (): Promise<ContentPostReference[]> =>
    await getAllPostsImpl(this as unknown as ContentManagerContext);

  scan = async (): Promise<readonly ContentSourceEntry[]> =>
    await scanImpl(this as unknown as ContentManagerContext);

  getContentDependencies = async (): Promise<
    ReadonlyMap<string, readonly string[]>
  > =>
    await getContentDependenciesImpl(this as unknown as ContentManagerContext);

  getPost = async (slug: string): Promise<string> =>
    await getPostImpl(this as unknown as ContentManagerContext, slug);

  getContentPaths = async (): Promise<Map<string, string[]>> =>
    await getContentPathsImpl(this as unknown as ContentManagerContext);

  getContentPath = async (slug: string): Promise<string> =>
    await getContentPathImpl(this as unknown as ContentManagerContext, slug);

  getPublicAssetReferences = async (): Promise<PublicAssetReferences> =>
    await getPublicAssetReferencesImpl(
      this as unknown as ContentManagerContext,
    );

  getContentIndex = async (
    plan?: ContentBuildPlan,
  ): Promise<Map<string, string>> =>
    await getContentIndexImpl(this as unknown as ContentManagerContext, plan);

  getProcessedContent = async (slug: string): Promise<PostContent> =>
    await getProcessedContentImpl(
      this as unknown as ContentManagerContext,
      slug,
    );

  processContent = async (slug: string): Promise<PostContent> =>
    await processContentImpl(this as unknown as ContentManagerContext, slug);

  getManifest = async (
    options?: ContentBuildOptions,
  ): Promise<ContentManifest> =>
    await getManifestImpl(this as unknown as ContentManagerContext, options);

  getRouteManifest = async (): Promise<ContentManifest> =>
    await getRouteManifestImpl(this as unknown as ContentManagerContext);

  getRequestManifest = async (): Promise<ContentManifest> =>
    await getRequestManifestImpl(this as unknown as ContentManagerContext);

  buildRouteManifest = async (): Promise<ContentManifest> =>
    await buildRouteManifestImpl(this as unknown as ContentManagerContext);

  buildManifest = async (
    options?: ContentBuildOptions,
  ): Promise<ContentManifest> =>
    await buildManifestImpl(this as unknown as ContentManagerContext, options);

  collectManifestEntries = async (
    plan: ContentBuildPlan,
    locations: ReadonlyMap<string, ContentPublicLocation>,
  ): Promise<{
    contentIndex: Map<string, string>;
    entries: ContentManifestEntry[];
  }> =>
    await collectManifestEntriesImpl(
      this as unknown as ContentManagerContext,
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
      this as unknown as ContentManagerContext,
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
      this as unknown as ContentManagerContext,
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
      this as unknown as ContentManagerContext,
      manifest,
      plan,
      cacheManifestEntries,
      startedAt,
      outputChangeSet,
    );

  build = async (options: ContentBuildOptions = {}): Promise<ContentManifest> =>
    await buildImpl(this as unknown as ContentManagerContext, options);

  getProcessedContentCount = (): number =>
    getProcessedContentCountImpl(this as unknown as ContentManagerContext);

  getReusedContentCount = (): number =>
    getReusedContentCountImpl(this as unknown as ContentManagerContext);

  getManifestHookMetrics = (): ManifestHookMetrics =>
    getManifestHookMetricsImpl(this as unknown as ContentManagerContext);

  getCompletedBuildSnapshot = (): CompletedContentBuildSnapshot | undefined =>
    getCompletedBuildSnapshotImpl(this as unknown as ContentManagerContext);

  recordFinalHtmlDiagnostics = (diagnostics: readonly Diagnostic[]): void =>
    recordFinalHtmlDiagnosticsImpl(
      this as unknown as ContentManagerContext,
      diagnostics,
    );

  getProvenance = (): BuildProvenance | undefined =>
    getProvenanceImpl(this as unknown as ContentManagerContext);

  attachFinalOutputArtifacts = async (
    buildId: string,
    fingerprints: Readonly<Record<string, string>>,
    cacheHits: ReadonlySet<string>,
  ): Promise<void> =>
    await attachFinalOutputArtifactsImpl(
      this as unknown as ContentManagerContext,
      buildId,
      fingerprints,
      cacheHits,
    );

  getNoChangeFastPathBlockReason = async (
    options: ContentBuildOptions = {},
  ): Promise<string | undefined> =>
    await getNoChangeFastPathBlockReasonImpl(
      this as unknown as ContentManagerContext,
      options,
    );

  getFullRegenerationReasons = async (): Promise<
    readonly FullRegenerationReason[]
  > =>
    await getFullRegenerationReasonsImpl(
      this as unknown as ContentManagerContext,
    );

  getOutputChangeSet = async (
    options: ContentBuildOptions = {},
  ): Promise<OutputChangeSet> =>
    await getOutputChangeSetImpl(
      this as unknown as ContentManagerContext,
      options,
    );

  getBacklinks = async (targetSlug: string): Promise<Backlink[]> =>
    await getBacklinksImpl(
      this as unknown as ContentManagerContext,
      targetSlug,
    );
}
