import type { ContentManifest } from "../types/content_manifest.js";
import type {
  ExternalDependencyScope,
  ExternalDependencySnapshot,
} from "../types/external_dependency.js";
import type { ContentBuildState } from "./content_build_state.js";
import { isExpired } from "./output_dependency_content.js";
import type {
  OutputChangeReason,
  OutputDescriptor,
} from "./output_dependency_types.js";

export function findChangedExternalScope(
  output: OutputDescriptor,
  changedExternalScopes: ReadonlyMap<string, ExternalDependencyScope>,
): OutputChangeReason | undefined {
  for (const [id, scope] of changedExternalScopes) {
    if (scope.type === "all") return { type: "external", id };
    if (scope.type === "content" && output.kind === "content")
      return { type: "external", id };
    if (scope.type === "output" && scope.paths.includes(output.path))
      return { type: "external", id };
  }
  return undefined;
}

export function changedExternalDependencies(input: {
  readonly previousState: ContentBuildState | undefined;
  readonly externalDependencies?: readonly ExternalDependencySnapshot[];
}): Set<string> {
  const previous = new Map(
    (input.previousState?.externalDependencies ?? []).map((dependency) => [
      dependency.id,
      dependency,
    ]),
  );
  const changed = new Set<string>();
  for (const dependency of input.externalDependencies ?? []) {
    const prior = previous.get(dependency.id);
    if (
      !prior ||
      prior.fingerprint !== dependency.fingerprint ||
      prior.expiresAt !== dependency.expiresAt ||
      isExpired(dependency.expiresAt)
    )
      changed.add(dependency.id);
    previous.delete(dependency.id);
  }
  for (const id of previous.keys()) changed.add(id);
  return changed;
}

export function changedExternalDependencyScopes(input: {
  readonly previousState: ContentBuildState | undefined;
  readonly externalDependencies?: readonly ExternalDependencySnapshot[];
}): ReadonlyMap<string, ExternalDependencyScope> {
  const previous = new Map(
    (input.previousState?.externalDependencies ?? []).map((dependency) => [
      dependency.id,
      dependency,
    ]),
  );
  const changed = new Map<string, ExternalDependencyScope>();
  for (const dependency of input.externalDependencies ?? []) {
    const prior = previous.get(dependency.id);
    if (
      !prior ||
      prior.fingerprint !== dependency.fingerprint ||
      prior.expiresAt !== dependency.expiresAt ||
      isExpired(dependency.expiresAt)
    ) {
      changed.set(dependency.id, dependency.scope);
    }
    previous.delete(dependency.id);
  }
  for (const dependency of previous.values()) {
    changed.set(dependency.id, dependency.scope);
  }
  return changed;
}

export function collectRefreshedContent(input: {
  readonly manifest: ContentManifest;
  readonly previousState: ContentBuildState | undefined;
  readonly contentFingerprints?: ReadonlyMap<string, string | undefined>;
}): Set<string> {
  const refreshed = new Set<string>();
  const fingerprints = input.contentFingerprints;
  const previousEntries = input.previousState?.entries;
  if (!fingerprints || !previousEntries) return refreshed;
  const previousBySlug = new Map(
    (input.previousState?.manifestEntries ?? []).map((entry) => [
      entry.slug,
      entry,
    ]),
  );
  for (const entry of input.manifest.entries) {
    const fingerprint = fingerprints.get(entry.slug);
    if (fingerprint === undefined) continue;
    const sourcePath =
      entry.sourcePath ??
      previousBySlug.get(entry.slug)?.sourcePath ??
      `${entry.slug}.md`;
    if (
      previousEntries[sourcePath]?.processedContentCacheFingerprint ===
      fingerprint
    ) {
      continue;
    }
    refreshed.add(entry.slug);
  }
  return refreshed;
}
