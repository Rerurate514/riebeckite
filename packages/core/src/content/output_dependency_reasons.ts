import type { ContentManifestEntry } from "../types/content_manifest.js";
import type { ExternalDependencyScope } from "../types/external_dependency.js";
import type { OutputDependency } from "../types/output_dependency.js";
import { findChangedExternalScope } from "./output_dependency_external.js";
import { normalizePublicPath } from "./output_dependency_paths.js";
import { contentQueryValue } from "./output_dependency_queries.js";
import type {
  OutputChangeReason,
  OutputDescriptor,
} from "./output_dependency_types.js";

export function findOutputChangeReason(
  output: OutputDescriptor,
  changedContent: ReadonlySet<string>,
  refreshedContent: ReadonlySet<string>,
  changedTags: ReadonlySet<string>,
  changedFolders: ReadonlySet<string>,
  changedFiles: ReadonlySet<string>,
  changedExternal: ReadonlySet<string>,
  changedExternalScopes: ReadonlyMap<string, ExternalDependencyScope>,
  currentPublicLocations: ReadonlyMap<string, ContentManifestEntry>,
  previousPublicLocations: ReadonlyMap<string, ContentManifestEntry>,
  previousEntries: readonly ContentManifestEntry[],
  currentEntries: readonly ContentManifestEntry[],
  changedProjections: ReadonlySet<
    Extract<OutputDependency, { type: "projection" }>["projection"]
  >,
): OutputChangeReason | undefined {
  const externalScope = findChangedExternalScope(output, changedExternalScopes);
  if (externalScope) return externalScope;
  for (const dependency of output.dependencies) {
    if (dependency.type === "unknown") return { type: "unknown-dependency" };
    if (dependency.type === "external" && changedExternal.has(dependency.id))
      return { type: "external", id: dependency.id };
    if (dependency.type === "global" && changedContent.size > 0)
      return { type: "global" };
    if (
      dependency.type === "content-query" &&
      isContentQueryAffected(dependency, previousEntries, currentEntries)
    )
      return {
        type: "content-query",
        properties: dependency.properties,
        unknown: dependency.unknown ?? false,
      };
    if (dependency.type === "projection") {
      if (
        (dependency.projection === "navigation" ||
          dependency.projection === "recent-posts") &&
        changedProjections.has(dependency.projection)
      )
        return { type: "projection", projection: dependency.projection };
      if (dependency.projection === "taxonomy-tags" && changedTags.size > 0)
        return { type: "projection", projection: dependency.projection };
      if (
        dependency.projection === "taxonomy-folders" &&
        changedFolders.size > 0
      )
        return { type: "projection", projection: dependency.projection };
    }
    if (
      dependency.type === "content" &&
      (changedContent.has(dependency.slug) ||
        refreshedContent.has(dependency.slug))
    )
      return { type: "content", slug: dependency.slug };
    if (dependency.type === "tag" && changedTags.has(dependency.tag))
      return { type: "tag", tag: dependency.tag };
    if (dependency.type === "folder" && changedFolders.has(dependency.folder))
      return { type: "folder", folder: dependency.folder };
    if (dependency.type === "file" && changedFiles.has(dependency.path))
      return { type: "file", path: dependency.path };
    if (dependency.type === "public-location") {
      const currentOwner = currentPublicLocations.get(
        normalizePublicPath(dependency.pathname),
      );
      const previousOwner = previousPublicLocations.get(
        normalizePublicPath(dependency.pathname),
      );
      if (currentOwner?.slug !== previousOwner?.slug)
        return { type: "public-location", pathname: dependency.pathname };
      if (
        (currentOwner &&
          (changedContent.has(currentOwner.slug) ||
            refreshedContent.has(currentOwner.slug))) ||
        (previousOwner &&
          (changedContent.has(previousOwner.slug) ||
            refreshedContent.has(previousOwner.slug)))
      )
        return { type: "public-location", pathname: dependency.pathname };
    }
  }
  return undefined;
}

export function isDerivedViewDependency(
  dependency: OutputDependency,
): dependency is Extract<OutputDependency, { type: "derived-view" }> {
  return dependency.type === "derived-view";
}

export function findChangedDerivedView(
  output: OutputDescriptor,
  previous: OutputDescriptor | undefined,
): OutputChangeReason | undefined {
  const current = new Map(
    output.dependencies
      .filter(isDerivedViewDependency)
      .map((dependency) => [dependency.id, dependency.version]),
  );
  const previousViews = new Map(
    (previous?.dependencies ?? [])
      .filter(isDerivedViewDependency)
      .map((dependency) => [dependency.id, dependency.version]),
  );
  for (const [id, version] of current) {
    if (previousViews.get(id) !== version) {
      return { type: "derived-view", id, version };
    }
  }
  for (const [id, version] of previousViews) {
    if (!current.has(id)) {
      return { type: "derived-view", id, version };
    }
  }
  return undefined;
}

export function isDerivedQueryDependency(
  dependency: OutputDependency,
): dependency is Extract<OutputDependency, { type: "derived-query" }> {
  return dependency.type === "derived-query";
}

export function findChangedDerivedQuery(
  output: OutputDescriptor,
  previous: OutputDescriptor | undefined,
): OutputChangeReason | undefined {
  const current = output.dependencies
    .filter(isDerivedQueryDependency)
    .map((dependency) => `${dependency.id}\0${dependency.fingerprint}`)
    .sort();
  const previousQueries = (previous?.dependencies ?? [])
    .filter(isDerivedQueryDependency)
    .map((dependency) => `${dependency.id}\0${dependency.fingerprint}`)
    .sort();
  if (
    current.length === previousQueries.length &&
    current.every((key, index) => key === previousQueries[index])
  ) {
    return undefined;
  }
  const changed =
    current.find((key, index) => key !== previousQueries[index]) ??
    previousQueries[current.length];
  const id = changed?.slice(0, changed.indexOf("\0")) ?? "unknown";
  return { type: "derived-query", id };
}

export function isContentQueryAffected(
  dependency: Extract<OutputDependency, { type: "content-query" }>,
  previousEntries: readonly ContentManifestEntry[],
  currentEntries: readonly ContentManifestEntry[],
): boolean {
  const previous = new Map(previousEntries.map((entry) => [entry.slug, entry]));
  const current = new Map(currentEntries.map((entry) => [entry.slug, entry]));
  const slugs = new Set([...previous.keys(), ...current.keys()]);
  for (const slug of slugs) {
    const before = previous.get(slug);
    const after = current.get(slug);
    if (!before || !after) {
      if ((before ?? after)?.publishing.discoverable) return true;
      continue;
    }
    if (before.publishing.discoverable !== after.publishing.discoverable)
      return true;
    if (!before.publishing.discoverable && !after.publishing.discoverable)
      continue;
    if (
      dependency.unknown ||
      dependency.properties.some((property) =>
        propertyChanged(before, after, property),
      )
    )
      return true;
  }
  return false;
}

export function propertyChanged(
  before: ContentManifestEntry,
  after: ContentManifestEntry,
  property: string,
): boolean {
  if (property === "*")
    return (
      JSON.stringify(before.frontmatter) !== JSON.stringify(after.frontmatter)
    );
  return (
    JSON.stringify(contentQueryValue(before, property)) !==
    JSON.stringify(contentQueryValue(after, property))
  );
}
