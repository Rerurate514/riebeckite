import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest.js";
import type {
  ExternalDependencyFailure,
  ExternalDependencyScope,
  ExternalDependencySnapshot,
} from "../types/external_dependency.js";
import type { OutputDependency } from "../types/output_dependency.js";
import type { ContentOutputDependencyResolver } from "../types/plugin.js";
import type { ContentBuildState } from "./content_build_state.js";
import type { ContentChangeSet } from "./content_change_set.js";

export type OutputKind = "content" | "redirect" | "plugin-page" | "generated";

export type OutputDescriptor = {
  readonly kind: OutputKind;
  readonly path: string;
  readonly producer: string;
  readonly dependencies: readonly OutputDependency[];
};

export type OutputChangeReason =
  | { readonly type: "new-output" }
  | { readonly type: "kind-changed"; readonly previousKind: OutputKind }
  | { readonly type: "unknown-dependency" }
  | { readonly type: "external"; readonly id: string }
  | { readonly type: "global" }
  | { readonly type: "content"; readonly slug: string }
  | { readonly type: "tag"; readonly tag: string }
  | { readonly type: "folder"; readonly folder: string }
  | { readonly type: "file"; readonly path: string }
  | { readonly type: "public-location"; readonly pathname: string }
  | {
      readonly type: "content-query";
      readonly properties: readonly string[];
      readonly unknown: boolean;
    }
  | {
      readonly type: "projection";
      readonly projection: Extract<
        OutputDependency,
        { type: "projection" }
      >["projection"];
    };

export type OutputChangeSet = {
  readonly affected: readonly OutputDescriptor[];
  readonly removed: readonly OutputDescriptor[];
  readonly unchanged: readonly OutputDescriptor[];
  readonly fullRegenerationRequired: boolean;
  readonly candidateOutputCount: number;
  readonly affectedOutputCount: number;
  readonly removedOutputCount: number;
  readonly unchangedOutputCount: number;
  readonly reasons?: ReadonlyMap<string, OutputChangeReason>;
};

export function determineOutputChanges(input: {
  readonly manifest: ContentManifest;
  readonly previousState: ContentBuildState | undefined;
  readonly changeSet: ContentChangeSet;
  readonly affectedContent: {
    readonly direct: ReadonlySet<string>;
    readonly dependent: ReadonlySet<string>;
  };
  readonly pluginPageOutputs?: readonly OutputDescriptor[];
  readonly contentOutputDependencies?:
    | readonly OutputDependency[]
    | ContentOutputDependencyResolver;
  readonly externalDependencies?: readonly ExternalDependencySnapshot[];
  readonly externalDependencyFailures?: readonly ExternalDependencyFailure[];
  readonly contentFingerprints?: ReadonlyMap<string, string | undefined>;
}): OutputChangeSet {
  const current = buildOutputInventory(
    input.manifest,
    input.pluginPageOutputs,
    input.contentOutputDependencies,
  );
  const previous = new Map(
    (input.previousState?.outputs ?? []).map((output) => [output.path, output]),
  );
  const currentPublicLocations = publicLocationOwners(
    input.manifest.publicEntries,
  );
  const previousPublicLocations = publicLocationOwners(
    (input.previousState?.manifestEntries ?? []).filter(
      (entry) => entry.publishing.routable,
    ),
  );
  const changedContent = collectChangedContent(input);
  const refreshedContent = collectRefreshedContent(input);
  const changedFiles = new Set([
    ...input.changeSet.added,
    ...input.changeSet.changed,
    ...input.changeSet.removed,
  ]);
  const changedTags = collectChangedTags(
    input.previousState,
    input.manifest,
    changedContent,
  );
  const changedFolders = collectChangedFolders(
    input.previousState,
    input.manifest,
    changedContent,
  );
  const changedExternal = changedExternalDependencies(input);
  const changedExternalScopes = changedExternalDependencyScopes(input);
  const affected = new Map<string, OutputDescriptor>();
  const unchanged: OutputDescriptor[] = [];
  const reasons = new Map<string, OutputChangeReason>();

  for (const output of current) {
    const reason = findOutputChangeReason(
      withPreviousDependencies(output, previous.get(output.path)),
      changedContent,
      refreshedContent,
      changedTags,
      changedFolders,
      changedFiles,
      changedExternal,
      changedExternalScopes,
      currentPublicLocations,
      previousPublicLocations,
      input.previousState?.manifestEntries ?? [],
      input.manifest.entries,
    );
    if (reason) {
      affected.set(output.path, output);
      reasons.set(output.path, reason);
    } else {
      unchanged.push(output);
    }
  }

  for (const output of current) {
    const previousOutput = previous.get(output.path);
    if (!previousOutput) {
      affected.set(output.path, output);
      reasons.set(output.path, { type: "new-output" });
    } else if (output.kind !== previousOutput.kind) {
      affected.set(output.path, output);
      reasons.set(output.path, {
        type: "kind-changed",
        previousKind: previousOutput.kind,
      });
    }
  }

  const currentPaths = new Set(current.map((output) => output.path));
  const removed = [...previous.values()].filter(
    (output) => !currentPaths.has(output.path),
  );
  const fullRegenerationRequired =
    (input.externalDependencyFailures?.length ?? 0) > 0 ||
    current.some((output) =>
      output.dependencies.some((dependency) => dependency.type === "unknown"),
    );
  const affectedValues = [...affected.values()].sort(compareOutput);
  const unchangedValues = unchanged
    .filter((output) => !affected.has(output.path))
    .sort(compareOutput);

  return {
    affected: affectedValues,
    removed: removed.sort(compareOutput),
    unchanged: unchangedValues,
    fullRegenerationRequired,
    candidateOutputCount: current.length,
    affectedOutputCount: affectedValues.length,
    removedOutputCount: removed.length,
    unchangedOutputCount: unchangedValues.length,
    reasons,
  };
}

export function buildOutputInventory(
  manifest: ContentManifest,
  pluginPageOutputs: readonly OutputDescriptor[] = [],
  contentOutputDependencies:
    | readonly OutputDependency[]
    | ContentOutputDependencyResolver = [],
): readonly OutputDescriptor[] {
  const outputs = new Map<string, OutputDescriptor>();
  for (const entry of manifest.publicEntries) {
    addOutput(
      outputs,
      contentOutput(entry, manifest, contentOutputDependencies),
    );
  }
  for (const [path, redirect] of manifest.publicRedirects) {
    addOutput(outputs, {
      kind: "redirect",
      path: htmlOutputPath(path),
      producer: `content:${redirect.slug}:redirect`,
      dependencies: [{ type: "content", slug: redirect.slug }],
    });
  }
  for (const output of pluginPageOutputs) {
    addOutput(outputs, {
      ...output,
      path: htmlOutputPath(output.path),
    });
  }
  for (const output of manifest.generatedOutputs) {
    addOutput(outputs, {
      kind: "generated",
      path: output.path,
      producer: `plugin:${output.owner}`,
      dependencies: output.dependencies ?? [{ type: "unknown" }],
    });
  }
  return [...outputs.values()].sort(compareOutput);
}

export function htmlOutputPath(pathname: string): string {
  const normalized = normalizePublicPath(pathname);
  if (normalized === "/") return "index.html";
  const withoutSlash = normalized.replace(/^\//, "");
  if (pathname.endsWith("/")) return `${withoutSlash}/index.html`;
  return `${withoutSlash}.html`;
}

function contentOutput(
  entry: ContentManifestEntry,
  manifest: ContentManifest,
  dependencies: readonly OutputDependency[] | ContentOutputDependencyResolver,
): OutputDescriptor {
  return {
    kind: "content",
    path: htmlOutputPath(entry.permalink),
    producer: `content:${entry.slug}`,
    dependencies: [
      { type: "content", slug: entry.slug },
      ...resolveContentOutputDependencies(dependencies, entry, manifest),
    ],
  };
}

function findOutputChangeReason(
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
): OutputChangeReason | undefined {
  const externalScope = findChangedExternalScope(output, changedExternalScopes);
  if (externalScope) return externalScope;
  for (const dependency of output.dependencies) {
    if (dependency.type === "unknown") return { type: "unknown-dependency" };
    if (dependency.type === "external" && changedExternal.has(dependency.id))
      return { type: "external", id: dependency.id };
    if (dependency.type === "global")
      return changedContent.size > 0 ? { type: "global" } : undefined;
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
        changedContent.size > 0
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

function isContentQueryAffected(
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

function propertyChanged(
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

export function contentQueryValue(
  entry: ContentManifestEntry,
  property: string,
): unknown {
  switch (property) {
    case "file.name":
      return `${entry.slug.split("/").at(-1) ?? entry.slug}.md`;
    case "file.path":
      return `${entry.slug}.md`;
    case "file.slug":
      return entry.slug;
    case "file.folder":
      return entry.slug.split("/").slice(0, -1).join("/");
    case "file.title":
      return entry.title;
    case "file.link":
    case "file.permalink":
      return entry.permalink;
    case "file.tags":
      return entry.tags;
    case "file.size":
      return entry.file?.size;
    case "file.ctime":
      return entry.file?.ctime;
    case "file.mtime":
      return entry.file?.mtime;
    case "file.links":
      return entry.links;
    default:
      return property
        .split(".")
        .reduce<unknown>(
          (value, key) =>
            value && typeof value === "object" && Object.hasOwn(value, key)
              ? (value as Record<string, unknown>)[key]
              : undefined,
          entry.frontmatter,
        );
  }
}

function resolveContentOutputDependencies(
  dependencies: readonly OutputDependency[] | ContentOutputDependencyResolver,
  entry: ContentManifestEntry,
  manifest: ContentManifest,
): readonly OutputDependency[] {
  return typeof dependencies === "function"
    ? dependencies({ entry, manifest })
    : dependencies;
}

function withPreviousDependencies(
  output: OutputDescriptor,
  previous: OutputDescriptor | undefined,
): OutputDescriptor {
  if (!previous || previous.kind !== output.kind) return output;
  return {
    ...output,
    dependencies: [...output.dependencies, ...previous.dependencies],
  };
}

function publicLocationOwners(
  entries: readonly ContentManifestEntry[],
): ReadonlyMap<string, ContentManifestEntry> {
  return new Map(
    entries.map((entry) => [
      normalizePublicPath(entry.publicLocation.permalink),
      entry,
    ]),
  );
}

function findChangedExternalScope(
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

function changedExternalDependencies(input: {
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

function changedExternalDependencyScopes(input: {
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

function collectRefreshedContent(input: {
  readonly manifest: ContentManifest;
  readonly previousState: ContentBuildState | undefined;
  readonly contentFingerprints?: ReadonlyMap<string, string | undefined>;
}): Set<string> {
  const refreshed = new Set<string>();
  const fingerprints = input.contentFingerprints;
  const previousEntries = input.previousState?.entries;
  if (!fingerprints || !previousEntries) return refreshed;
  for (const entry of input.manifest.entries) {
    const fingerprint = fingerprints.get(entry.slug);
    if (fingerprint === undefined) continue;
    if (
      previousEntries[`${entry.slug}.md`]?.processedContentCacheFingerprint ===
      fingerprint
    ) {
      continue;
    }
    refreshed.add(entry.slug);
  }
  return refreshed;
}

function collectChangedContent(input: {
  readonly manifest: ContentManifest;
  readonly previousState: ContentBuildState | undefined;
  readonly changeSet: ContentChangeSet;
  readonly affectedContent: {
    readonly direct: ReadonlySet<string>;
    readonly dependent: ReadonlySet<string>;
  };
}): Set<string> {
  const changed = new Set([
    ...input.affectedContent.direct,
    ...input.affectedContent.dependent,
    ...input.changeSet.removed.filter(isMarkdownPath).map(toSlug),
  ]);
  const previousEntries = input.previousState?.manifestEntries ?? [];
  const currentEntries = input.manifest.entries;
  const previousBySlug = new Map(
    previousEntries.map((entry) => [entry.slug, entry]),
  );
  const currentBySlug = new Map(
    currentEntries.map((entry) => [entry.slug, entry]),
  );
  for (const slug of changed) {
    for (const target of linkTargets(previousBySlug.get(slug)))
      changed.add(target);
    for (const target of linkTargets(currentBySlug.get(slug)))
      changed.add(target);
  }
  return changed;
}

function isExpired(expiresAt: string | undefined): boolean {
  return expiresAt !== undefined && Date.parse(expiresAt) <= Date.now();
}

function collectChangedTags(
  previousState: ContentBuildState | undefined,
  manifest: ContentManifest,
  changedContent: ReadonlySet<string>,
): Set<string> {
  const previousBySlug = new Map(
    (previousState?.manifestEntries ?? []).map((entry) => [entry.slug, entry]),
  );
  const currentBySlug = new Map(
    manifest.entries.map((entry) => [entry.slug, entry]),
  );
  const tags = new Set<string>();
  for (const slug of changedContent) {
    for (const tag of previousBySlug.get(slug)?.tags ?? []) tags.add(tag);
    for (const tag of currentBySlug.get(slug)?.tags ?? []) tags.add(tag);
  }
  return tags;
}

function collectChangedFolders(
  previousState: ContentBuildState | undefined,
  manifest: ContentManifest,
  changedContent: ReadonlySet<string>,
): Set<string> {
  const previousBySlug = new Map(
    (previousState?.manifestEntries ?? []).map((entry) => [entry.slug, entry]),
  );
  const currentBySlug = new Map(
    manifest.entries.map((entry) => [entry.slug, entry]),
  );
  const folders = new Set<string>();
  for (const slug of changedContent) {
    addFolderAncestors(folders, previousBySlug.get(slug)?.slug ?? slug);
    addFolderAncestors(folders, currentBySlug.get(slug)?.slug ?? slug);
  }
  return folders;
}

function addFolderAncestors(folders: Set<string>, slug: string): void {
  const segments = slug.split("/");
  segments.pop();
  while (true) {
    folders.add(segments.join("/"));
    if (segments.length === 0) return;
    segments.pop();
  }
}

function linkTargets(entry: ContentManifestEntry | undefined): string[] {
  if (!entry) return [];
  return entry.links
    .filter(
      (link): link is typeof link & { slug: string } => link.slug !== null,
    )
    .map((link) => link.slug);
}

function addOutput(
  outputs: Map<string, OutputDescriptor>,
  output: OutputDescriptor,
): void {
  const existing = outputs.get(output.path);
  if (existing) {
    assertNoGeneratedOutputCollision(existing, output);
  }
  outputs.set(output.path, output);
}

function assertNoGeneratedOutputCollision(
  existing: OutputDescriptor,
  incoming: OutputDescriptor,
): void {
  if (existing.kind !== "generated" && incoming.kind !== "generated") return;
  if (
    existing.kind === incoming.kind &&
    existing.producer === incoming.producer
  )
    return;
  throw new Error(
    `Generated output path "${incoming.path}" collides with ${existing.kind} output owned by "${existing.producer}" and ${incoming.kind} output owned by "${incoming.producer}".`,
  );
}

function normalizePublicPath(pathname: string): string {
  const path = `/${pathname.split("/").filter(Boolean).join("/")}`;
  return path === "/" ? path : path.replace(/\/$/, "");
}

function isMarkdownPath(path: string): boolean {
  return path.endsWith(".md");
}

function toSlug(path: string): string {
  return path.replace(/\.md$/, "");
}

function compareOutput(
  left: OutputDescriptor,
  right: OutputDescriptor,
): number {
  return (
    left.path.localeCompare(right.path) || left.kind.localeCompare(right.kind)
  );
}
