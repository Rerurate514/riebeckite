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
import { asContentManagerContext } from "./content_manager_context.js";
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
}
