import type { Observability } from "../observability.js";
import type { Pipeline } from "../pipeline.js";
import type {
  ContentManifest,
  ContentManifestEntry,
  ContentPublicLocation,
} from "../types/content_manifest.js";
import type { Diagnostic } from "../types/diagnostic.js";
import type { ResolvedPluginPage } from "../types/plugin_page.js";
import type { PublishStrategy } from "../types/publish_strategy.js";
import type { ContentBuildPlan } from "./content_build_plan.js";
import type { ContentGraph } from "./content_graph.js";
import {
  commitBuildStateImpl,
  computePipelineFingerprintImpl,
  createPipelineImpl,
  enableBuildTimeImpl,
  getBuildPlanImpl,
  getPipelineFingerprintImpl,
  getPipelineImpl,
  requestBuildStateCommitImpl,
  requiresFullContentRegenerationImpl,
} from "./content_manager_build.js";
import {
  emitPublicImageAssetsImpl,
  ensureRoutableSlugsImpl,
  getProcessedContentCacheFingerprintImpl,
  isRoutableImpl,
  observabilityImpl,
  resolveRoutableSlugsImpl,
  reuseManifestEntryImpl,
} from "./content_manager_cache.js";
import type { ContentManagerContext } from "./content_manager_context.js";
import {
  disposeImpl,
  getContentGraphImpl,
  getContentLocationsImpl,
  getDiagnosticsImpl,
  getPagePathsImpl,
  inspectImpl,
  publishStrategyImpl,
  resolvePageImpl,
} from "./content_manager_inspect.js";
import { ContentManagerMethodsA } from "./content_manager_methods_a.js";
import type {
  ContentBuildOptions,
  ContentInspection,
} from "./content_manager_shared.js";

export class ContentManagerMethodsB extends ContentManagerMethodsA {
  getContentGraph = async (): Promise<ContentGraph> =>
    await getContentGraphImpl(this as unknown as ContentManagerContext);

  getDiagnostics = async (): Promise<Diagnostic[]> =>
    await getDiagnosticsImpl(this as unknown as ContentManagerContext);

  resolvePage = async (pathname: string): Promise<ResolvedPluginPage | null> =>
    await resolvePageImpl(this as unknown as ContentManagerContext, pathname);

  getPagePaths = async (): Promise<readonly string[]> =>
    await getPagePathsImpl(this as unknown as ContentManagerContext);

  inspect = async (): Promise<ContentInspection> =>
    await inspectImpl(this as unknown as ContentManagerContext);

  dispose = async (): Promise<void> =>
    await disposeImpl(this as unknown as ContentManagerContext);

  getContentLocations = async (): Promise<
    ReadonlyMap<string, ContentPublicLocation>
  > => await getContentLocationsImpl(this as unknown as ContentManagerContext);

  publishStrategy = (): PublishStrategy =>
    publishStrategyImpl(this as unknown as ContentManagerContext);

  reuseManifestEntry = (
    slug: string,
    sourcePath: string,
    source: string,
    plan: ContentBuildPlan,
  ): ContentManifestEntry | null =>
    reuseManifestEntryImpl(
      this as unknown as ContentManagerContext,
      slug,
      sourcePath,
      source,
      plan,
    );

  getPipelineFingerprint = (): string | undefined =>
    getPipelineFingerprintImpl(this as unknown as ContentManagerContext);

  requestBuildStateCommit = (options?: ContentBuildOptions): void =>
    requestBuildStateCommitImpl(
      this as unknown as ContentManagerContext,
      options,
    );

  commitBuildState = async (): Promise<void> =>
    await commitBuildStateImpl(this as unknown as ContentManagerContext);

  getBuildPlan = (options?: ContentBuildOptions): Promise<ContentBuildPlan> =>
    getBuildPlanImpl(this as unknown as ContentManagerContext, options);

  computePipelineFingerprint = (
    locations?: ReadonlyMap<string, ContentPublicLocation>,
  ): string =>
    computePipelineFingerprintImpl(
      this as unknown as ContentManagerContext,
      locations,
    );

  requiresFullContentRegeneration = (): boolean =>
    requiresFullContentRegenerationImpl(
      this as unknown as ContentManagerContext,
    );

  getProcessedContentCacheFingerprint = (
    slug: string,
    source: string,
  ): string | undefined =>
    getProcessedContentCacheFingerprintImpl(
      this as unknown as ContentManagerContext,
      slug,
      source,
    );

  isRoutable = (slug: string): boolean =>
    isRoutableImpl(this as unknown as ContentManagerContext, slug);

  ensureRoutableSlugs = async (): Promise<Set<string>> =>
    await ensureRoutableSlugsImpl(this as unknown as ContentManagerContext);

  resolveRoutableSlugs = async (): Promise<Set<string>> =>
    await resolveRoutableSlugsImpl(this as unknown as ContentManagerContext);

  getPipeline = async (): Promise<Pipeline> =>
    await getPipelineImpl(this as unknown as ContentManagerContext);

  createPipeline = async (): Promise<Pipeline> =>
    await createPipelineImpl(this as unknown as ContentManagerContext);

  enableBuildTime = (): void =>
    enableBuildTimeImpl(this as unknown as ContentManagerContext);

  emitPublicImageAssets = async (manifest: ContentManifest): Promise<void> =>
    await emitPublicImageAssetsImpl(
      this as unknown as ContentManagerContext,
      manifest,
    );

  observability = (): Observability =>
    observabilityImpl(this as unknown as ContentManagerContext);
}
