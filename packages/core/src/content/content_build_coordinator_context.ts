import type { Observability } from "../observability.js";
import type { BuildProvenance } from "../provenance/provenance.js";
import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest.js";
import type {
  ExternalDependencyFailure,
  ExternalDependencySnapshot,
} from "../types/external_dependency.js";
import type { ContentPathResolver } from "./affected_content.js";
import type { ContentBuildPlan } from "./content_build_plan.js";
import type {
  ContentBuildState,
  FingerprintedContentEntry,
  ManifestHookCacheEntry,
} from "./content_build_state.js";
import type { ContentChangeSet } from "./content_change_set.js";
import type { CachedContentDependency } from "./content_dependency_tracker.js";
import type { ContentSourceEntry } from "./content_source.js";
import type { OutputDescriptor } from "./output_dependency.js";

export type ContentBuildCoordinatorDependencies = {
  readonly buildStatePath: string;
  readonly getEntries: () => Promise<readonly ContentSourceEntry[]>;
  readonly readEntry: (entry: ContentSourceEntry) => Promise<string>;
  readonly observability: Observability;
  readonly includeFileMetadata: boolean;
  readonly pathResolver?: ContentPathResolver;
  readonly getContentDependencies?: (
    entry: ContentSourceEntry,
    paths: readonly string[],
  ) => Promise<readonly string[]>;
};

export interface ContentBuildCoordinatorContext {
  plan: Promise<ContentBuildPlan> | null;
  dependencies: ContentBuildCoordinatorDependencies;
  getPlan(
    incremental: boolean,
    pipelineFingerprint: string | undefined,
    fullContentRegenerationRequired: unknown,
    externalDependencies: readonly ExternalDependencySnapshot[],
    externalDependencyFailures: readonly ExternalDependencyFailure[],
    publishingBuildTime: unknown,
  ): Promise<ContentBuildPlan>;
  commit(
    plan: ContentBuildPlan,
    manifest: ContentManifest,
    pipelineFingerprint: string | undefined,
    outputs: readonly OutputDescriptor[],
    manifestEntries: readonly ContentManifestEntry[],
    trackedDependencies: ReadonlyMap<
      string,
      readonly CachedContentDependency[]
    >,
    externalDependencies: readonly ExternalDependencySnapshot[],
    processedContentCacheFingerprints: ReadonlyMap<string, string | undefined>,
    manifestHookCache: readonly ManifestHookCacheEntry[],
    publishingBuildTime: Date,
    provenance?: BuildProvenance,
  ): Promise<void>;
  attachFinalOutputArtifacts(
    buildId: string,
    fingerprints: Readonly<Record<string, string>>,
    cacheHits: ReadonlySet<string>,
  ): Promise<void>;
  prepare(
    incremental: boolean,
    pipelineFingerprint: string | undefined,
    fullContentRegenerationRequired: boolean,
    externalDependencies: readonly ExternalDependencySnapshot[],
    externalDependencyFailures: readonly ExternalDependencyFailure[],
    publishingBuildTime: Date,
  ): Promise<ContentBuildPlan>;
  getContentAliases(
    currentEntries: readonly FingerprintedContentEntry[],
    previousState: ContentBuildState | undefined,
    changeSet: ContentChangeSet,
  ): Promise<ReadonlyMap<string, readonly string[]>>;
}

export function asContentBuildCoordinatorContext<Self>(
  self: Self,
): ContentBuildCoordinatorContext {
  return self as ContentBuildCoordinatorContext;
}
