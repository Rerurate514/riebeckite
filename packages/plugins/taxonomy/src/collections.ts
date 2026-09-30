import {
  buildContentCollections,
  type ContentCollectionContext,
  type ContentCollectionDefinition,
  type ContentManifestEntry,
  type ContentQueryGroupBy,
  stripHtml,
} from "@riebeckite/core";
import { slugifyTaxonomyValue } from "./slug.js";
import type {
  ResolvedTaxonomyOptions,
  TaxonomyEntryReference,
  TaxonomyFeedLinks,
  TaxonomyIndex,
  TaxonomyIndexData,
  TaxonomyKind,
  TaxonomyTerm,
  TaxonomyTermData,
} from "./types.js";

/**
 * Builds the tag and folder taxonomy for the given entries. It reuses the Core
 * collection contract (`buildContentCollections`), so entries are selected and
 * ordered by the shared query engine and links always use the resolved
 * `permalink`.
 *
 * `entries` should be the manifest's public view; unpublished notes never reach
 * generated data or feeds.
 */
export function buildTaxonomyIndex(
  entries: readonly ContentManifestEntry[],
  options: ResolvedTaxonomyOptions,
): TaxonomyIndex {
  const tags = options.tags
    ? buildTerms(entries, {
        kind: "tag",
        basePath: options.tagsBasePath,
        groupBy: { by: "tags" },
        options,
      })
    : [];
  const folders = options.folders
    ? buildTerms(entries, {
        kind: "folder",
        basePath: options.foldersBasePath,
        groupBy:
          options.folderDepth > 0
            ? { by: "folder", depth: options.folderDepth }
            : { by: "folder" },
        options,
      })
    : [];

  if (options.related && tags.length > 0) {
    attachRelatedTerms(tags, entries, options);
  }

  return { tags, folders };
}

/** Projects a term into a JSON-safe shape for endpoints and client data. */
export function serializeTaxonomyTerm(term: TaxonomyTerm): TaxonomyTermData {
  return {
    kind: term.kind,
    value: term.value,
    title: term.title,
    path: term.path,
    permalink: term.path,
    count: term.entries.length,
    entries: term.entries.map(toEntryReference),
    related: term.related,
    feeds: term.feeds,
  };
}

/** Projects the whole index into a JSON-safe shape. */
export function serializeTaxonomyIndex(
  index: TaxonomyIndex,
): TaxonomyIndexData {
  return {
    tags: index.tags.map(serializeTaxonomyTerm),
    folders: index.folders.map(serializeTaxonomyTerm),
  };
}

export function toEntryReference(
  entry: ContentManifestEntry,
): TaxonomyEntryReference {
  return {
    slug: entry.slug,
    permalink: entry.permalink,
    title: entry.title,
    updated: getEntryUpdatedTime(entry),
    summary: getEntrySummary(entry),
  };
}

function buildTerms(
  entries: readonly ContentManifestEntry[],
  input: {
    kind: TaxonomyKind;
    basePath: string;
    groupBy: ContentQueryGroupBy;
    options: ResolvedTaxonomyOptions;
  },
): TaxonomyTerm[] {
  const { kind, basePath, groupBy, options } = input;
  const definition: ContentCollectionDefinition = {
    kind,
    basePath,
    groupBy,
    resolveTitle: (context) => resolveTermTitle(context, options),
    resolvePath: ({ value }) =>
      `${basePath}/${slugifyTaxonomyValue(value)}`.replace(/\/{2,}/g, "/"),
  };
  const collections = buildContentCollections(entries, [definition]);
  const terms: TaxonomyTerm[] = [];
  const seen = new Set<string>();

  for (const collection of collections) {
    if (collection.value.trim() === "") continue;
    if (collection.entries.length < options.minEntries) continue;

    const path = normalizeTermPath(collection.path, basePath);
    if (seen.has(path)) continue;
    seen.add(path);

    terms.push({
      kind,
      value: collection.value,
      title: collection.title,
      path,
      entries: collection.entries,
      related: [],
      feeds: buildFeedLinks(path, options),
      feedFiles: buildFeedFiles(path, options),
    });
  }

  return terms;
}

function resolveTermTitle(
  context: ContentCollectionContext,
  options: ResolvedTaxonomyOptions,
): string {
  const kind: TaxonomyKind = context.kind === "tag" ? "tag" : "folder";
  const custom = options.resolveTitle?.({
    kind,
    value: context.value,
    basePath: context.basePath,
  });
  if (typeof custom === "string" && custom.trim() !== "") return custom.trim();
  return context.kind === "tag" ? `#${context.value}` : context.value;
}

function attachRelatedTerms(
  tags: TaxonomyTerm[],
  entries: readonly ContentManifestEntry[],
  options: ResolvedTaxonomyOptions,
): void {
  const byValue = new Map(tags.map((term) => [term.value, term]));
  const counts = new Map<string, Map<string, number>>();

  for (const entry of entries) {
    for (const tag of entry.tags) {
      if (!byValue.has(tag)) continue;
      let coOccurrence = counts.get(tag);
      if (!coOccurrence) {
        coOccurrence = new Map();
        counts.set(tag, coOccurrence);
      }
      for (const other of entry.tags) {
        if (other === tag) continue;
        coOccurrence.set(other, (coOccurrence.get(other) ?? 0) + 1);
      }
    }
  }

  for (const term of tags) {
    const coOccurrence = counts.get(term.value);
    if (!coOccurrence) continue;
    term.related = [...coOccurrence.entries()]
      .map(([value, count]) => ({ term: byValue.get(value), count }))
      .filter(
        (candidate): candidate is { term: TaxonomyTerm; count: number } =>
          candidate.term !== undefined,
      )
      .sort(
        (left, right) =>
          right.count - left.count ||
          left.term.value.localeCompare(right.term.value, "en"),
      )
      .slice(0, options.relatedLimit)
      .map(({ term: related, count }) => ({
        kind: related.kind,
        value: related.value,
        title: related.title,
        path: related.path,
        permalink: related.path,
        count,
      }));
  }
}

function buildFeedLinks(
  path: string,
  options: ResolvedTaxonomyOptions,
): TaxonomyFeedLinks {
  const links: TaxonomyFeedLinks = {};
  if (options.feeds.rss) links.rss = `${path}/feed.xml`;
  if (options.feeds.atom) links.atom = `${path}/atom.xml`;
  if (options.feeds.json) links.json = `${path}/feed.json`;
  return links;
}

function buildFeedFiles(
  path: string,
  options: ResolvedTaxonomyOptions,
): string[] {
  const base = path.replace(/^\/+/, "");
  const files: string[] = [];
  if (options.feeds.rss) files.push(`${base}/feed.xml`);
  if (options.feeds.atom) files.push(`${base}/atom.xml`);
  if (options.feeds.json) files.push(`${base}/feed.json`);
  return files;
}

function normalizeTermPath(path: string, basePath: string): string {
  const normalized = path.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  if (normalized !== "") return normalized;
  return basePath || "/";
}

function getEntrySummary(entry: ContentManifestEntry): string {
  const description = entry.frontmatter.description;
  if (typeof description === "string" && description.trim() !== "") {
    return description.trim();
  }
  return stripHtml(entry.html).replace(/\s+/g, " ").trim().slice(0, 200);
}

function getEntryUpdatedTime(entry: ContentManifestEntry): string | null {
  const value =
    entry.frontmatter.updated ??
    entry.frontmatter.published ??
    entry.frontmatter.date ??
    entry.frontmatter.created;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
