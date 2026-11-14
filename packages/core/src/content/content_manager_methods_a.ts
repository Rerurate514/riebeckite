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
import { asContentManagerContext } from "./content_manager_context.js";
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
}
