import type { BuildProvenance } from "../provenance/provenance.js";
import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest.js";
import type {
  ExternalDependencyFailure,
  ExternalDependencySnapshot,
} from "../types/external_dependency.js";
import type { ContentBuildCoordinatorContext } from "./content_build_coordinator_context.js";
import type { ContentBuildPlan } from "./content_build_plan.js";
import type { ManifestHookCacheEntry } from "./content_build_state.js";
import {
  attachFinalOutputArtifactsImpl,
  commitImpl,
  getPlanImpl,
} from "./content_coordinator_methods_a.js";
import type { CachedContentDependency } from "./content_dependency_tracker.js";
import type { OutputDescriptor } from "./output_dependency.js";

export class ContentCoordinatorDelegatesA {
  getPlan(
    incremental: boolean,
    pipelineFingerprint: string | undefined,
    fullContentRegenerationRequired = false,
    externalDependencies: readonly ExternalDependencySnapshot[] = [],
    externalDependencyFailures: readonly ExternalDependencyFailure[] = [],
    publishingBuildTime = new Date(),
  ): Promise<ContentBuildPlan> {
    return getPlanImpl(
      this as unknown as ContentBuildCoordinatorContext,
      incremental,
      pipelineFingerprint,
      fullContentRegenerationRequired,
      externalDependencies,
      externalDependencyFailures,
      publishingBuildTime,
    );
  }

  async commit(
    plan: ContentBuildPlan,
    manifest: ContentManifest,
    pipelineFingerprint: string | undefined,
    outputs: readonly OutputDescriptor[] = [],
    manifestEntries: readonly ContentManifestEntry[] = manifest.entries,
    trackedDependencies: ReadonlyMap<
      string,
      readonly CachedContentDependency[]
    > = new Map(),
    externalDependencies: readonly ExternalDependencySnapshot[] = [],
    processedContentCacheFingerprints: ReadonlyMap<
      string,
      string | undefined
    > = new Map(),
    manifestHookCache: readonly ManifestHookCacheEntry[] = [],
    publishingBuildTime: Date,
    provenance?: BuildProvenance,
  ): Promise<void> {
    return commitImpl(
      this as unknown as ContentBuildCoordinatorContext,
      plan,
      manifest,
      pipelineFingerprint,
      outputs,
      manifestEntries,
      trackedDependencies,
      externalDependencies,
      processedContentCacheFingerprints,
      manifestHookCache,
      publishingBuildTime,
      provenance,
    );
  }

  async attachFinalOutputArtifacts(
    buildId: string,
    fingerprints: Readonly<Record<string, string>>,
    cacheHits: ReadonlySet<string>,
  ): Promise<void> {
    return attachFinalOutputArtifactsImpl(
      this as unknown as ContentBuildCoordinatorContext,
      buildId,
      fingerprints,
      cacheHits,
    );
  }
}
