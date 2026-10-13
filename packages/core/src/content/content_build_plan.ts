import type { ContentManifestEntry } from "../types/content_manifest.js";
import type {
  ExternalDependencyFailure,
  ExternalDependencySnapshot,
} from "../types/external_dependency.js";
import type { determineAffectedContent } from "./affected_content.js";
import type {
  ContentBuildState,
  FingerprintedContentEntry,
} from "./content_build_state.js";
import type { ContentChangeSet } from "./content_change_set.js";
import type { OutputChangeSet, OutputDescriptor } from "./output_dependency.js";

export type FullRegenerationReason =
  | "incremental-disabled"
  | "cache-missing-or-invalid"
  | "pipeline-fingerprint-changed"
  | "content-plugin-uncacheable"
  | "external-dependency-unavailable";

export type ContentBuildPlan = {
  readonly incremental: boolean;
  readonly previousState: ContentBuildState | undefined;
  readonly previousManifestEntriesBySlug: ReadonlyMap<
    string,
    ContentManifestEntry
  >;
  readonly currentEntries: readonly FingerprintedContentEntry[];
  readonly currentContentAliases: ReadonlyMap<string, readonly string[]>;
  readonly currentContentIndex: Map<string, string>;
  readonly currentContentIndexAmbiguities: ReadonlyMap<
    string,
    readonly string[]
  >;
  readonly changeSet: ContentChangeSet;
  readonly affectedContent: ReturnType<typeof determineAffectedContent>;
  readonly cacheValid: boolean;
  readonly fullRegenerationReasons: readonly FullRegenerationReason[];
  readonly reusableOutputs: readonly OutputDescriptor[] | undefined;
  readonly externalDependencies: readonly ExternalDependencySnapshot[];
  readonly externalDependencyFailures: readonly ExternalDependencyFailure[];
};

export function reusableOutputChangeSet(
  outputs: readonly OutputDescriptor[],
): OutputChangeSet {
  const unchanged = [...outputs].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  return {
    affected: [],
    removed: [],
    unchanged,
    fullRegenerationRequired: unchanged.some((output) =>
      output.dependencies.some((dependency) => dependency.type === "unknown"),
    ),
    candidateOutputCount: unchanged.length,
    affectedOutputCount: 0,
    removedOutputCount: 0,
    unchangedOutputCount: unchanged.length,
  };
}
