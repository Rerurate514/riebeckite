import type { ContentManifest, ContentManifestEntry } from "@riebeckite/core";
import { resolveSeriesOptions } from "./series_options.js";
import type {
  ResolvedSeriesOptions,
  SeriesIndex,
  SeriesMember,
  SeriesOptions,
} from "./types.js";

/**
 * Groups every manifest entry that declares a series and returns one
 * `SeriesIndex` per series, in first-seen order. Members are sorted by
 * `orderKey`, then the `date`/`created`/`published` frontmatter value, then
 * `title`, then `slug`, so ties resolve deterministically.
 */
export function collectSeriesIndexes(
  manifest: ContentManifest,
  options: SeriesOptions = {},
): SeriesIndex[] {
  const resolved = resolveSeriesOptions(options);
  const groups = new Map<string, ContentManifestEntry[]>();
  const titles = new Map<string, string>();

  for (const entry of manifest.entries) {
    const name = readSeriesName(entry, resolved.key);
    if (!name) continue;

    const group = groups.get(name);
    if (group) group.push(entry);
    else groups.set(name, [entry]);

    if (!titles.has(name)) {
      const title = readString(entry, resolved.titleKey);
      if (title) titles.set(name, title);
    }
  }

  const indexes: SeriesIndex[] = [];
  for (const [name, entries] of groups) {
    const members = [...entries]
      .sort((a, b) => compareEntries(a, b, resolved))
      .map((entry) => toMember(manifest, entry, resolved, name));
    const languages = new Set(
      entries
        .map((entry) => entry.publicLocation.language)
        .filter((language): language is string => Boolean(language)),
    );
    const language = languages.size === 1 ? [...languages][0] : undefined;
    indexes.push({
      name,
      title: titles.get(name) ?? name,
      members,
      ...(language ? { language } : {}),
    });
  }
  return indexes;
}

/** Returns a single series index, or `null` when no note declares `name`. */
export function buildSeriesIndex(
  manifest: ContentManifest,
  name: string,
  options: SeriesOptions = {},
): SeriesIndex | null {
  return (
    collectSeriesIndexes(manifest, options).find(
      (index) => index.name === name,
    ) ?? null
  );
}

export function toMember(
  manifest: ContentManifest,
  entry: ContentManifestEntry,
  resolved: ResolvedSeriesOptions,
  name: string,
): SeriesMember {
  return {
    slug: entry.slug,
    title: entry.title || entry.slug,
    permalink: manifest.bySlug.get(entry.slug)?.permalink ?? entry.permalink,
    order: readSeriesOrder(entry, resolved.orderKey) ?? null,
    series: name,
  };
}

export function compareEntries(
  a: ContentManifestEntry,
  b: ContentManifestEntry,
  resolved: ResolvedSeriesOptions,
): number {
  const orderA =
    readSeriesOrder(a, resolved.orderKey) ?? Number.POSITIVE_INFINITY;
  const orderB =
    readSeriesOrder(b, resolved.orderKey) ?? Number.POSITIVE_INFINITY;
  if (orderA !== orderB) return orderA < orderB ? -1 : 1;

  const dateA = readSeriesDate(a) ?? Number.POSITIVE_INFINITY;
  const dateB = readSeriesDate(b) ?? Number.POSITIVE_INFINITY;
  if (dateA !== dateB) return dateA < dateB ? -1 : 1;

  if (a.title !== b.title) return a.title < b.title ? -1 : 1;
  if (a.slug !== b.slug) return a.slug < b.slug ? -1 : 1;
  return 0;
}

export function readSeriesName(
  entry: ContentManifestEntry,
  key: string,
): string | undefined {
  return readString(entry, key);
}

export function readSeriesOrder(
  entry: ContentManifestEntry,
  key: string,
): number | undefined {
  const value = entry.frontmatter[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

export function readString(
  entry: ContentManifestEntry,
  key: string,
): string | undefined {
  const value = entry.frontmatter[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function readSeriesDate(
  entry: ContentManifestEntry,
): number | undefined {
  for (const key of ["date", "created", "published"] as const) {
    const time = parseDate(entry.frontmatter[key]);
    if (time !== undefined) return time;
  }
  return undefined;
}

export function parseDate(value: unknown): number | undefined {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : undefined;
  }
  if (typeof value === "string") {
    const time = Date.parse(value);
    return Number.isNaN(time) ? undefined : time;
  }
  return undefined;
}

export function hasFrontmatterKey(
  entry: ContentManifestEntry,
  key: string,
): boolean {
  return Object.hasOwn(entry.frontmatter, key);
}
