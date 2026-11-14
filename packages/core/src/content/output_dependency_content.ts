import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest.js";
import type { ContentBuildState } from "./content_build_state.js";
import type { ContentChangeSet } from "./content_change_set.js";
import { isMarkdownPath, toSlug } from "./output_dependency_util.js";

export function collectChangedContent(input: {
  readonly manifest: ContentManifest;
  readonly previousState: ContentBuildState | undefined;
  readonly changeSet: ContentChangeSet;
  readonly affectedContent: {
    readonly direct: ReadonlySet<string>;
    readonly dependent: ReadonlySet<string>;
  };
  readonly contentPathToSlug?: (path: string) => string | undefined;
}): Set<string> {
  const changed = new Set([
    ...input.affectedContent.direct,
    ...input.affectedContent.dependent,
    ...input.changeSet.removed.flatMap((path) => {
      const slug =
        input.contentPathToSlug?.(path) ??
        (isMarkdownPath(path) ? toSlug(path) : undefined);
      return slug === undefined ? [] : [slug];
    }),
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

export function isExpired(expiresAt: string | undefined): boolean {
  return expiresAt !== undefined && Date.parse(expiresAt) <= Date.now();
}

export function collectChangedTags(
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

export function collectChangedFolders(
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

export function addFolderAncestors(folders: Set<string>, slug: string): void {
  const segments = slug.split("/");
  segments.pop();
  while (true) {
    folders.add(segments.join("/"));
    if (segments.length === 0) return;
    segments.pop();
  }
}

export function linkTargets(entry: ContentManifestEntry | undefined): string[] {
  if (!entry) return [];
  return entry.links
    .filter(
      (link): link is typeof link & { slug: string } => link.slug !== null,
    )
    .map((link) => link.slug);
}
