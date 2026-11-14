import type { ContentManifestEntry } from "../types/content_manifest.js";
import { selectLocalizedEntries } from "./content_language.js";
import { applyPagination, applySort } from "./content_query_sort.js";
import type {
  ContentQueryDateFilter,
  ContentQueryFilter,
  ContentQueryFrontmatterFilter,
  ContentQueryPage,
  ContentQueryPagination,
  ContentQueryScalar,
  ContentQuerySpec,
  ContentQueryTagFilter,
} from "./content_query_types.js";

export function queryContentEntries(
  entries: readonly ContentManifestEntry[],
  spec: ContentQuerySpec = {},
): ContentManifestEntry[] {
  const filter = spec.filter ?? {};
  const localized = filter.locale
    ? selectLocalizedEntries(entries, filter.locale)
    : entries;
  const matched = localized.filter((entry) => matchesFilter(entry, filter));
  const sorted = applySort(matched, spec.sort);
  return applyPagination(sorted, spec.offset, spec.limit);
}

export function queryContentPage(
  entries: readonly ContentManifestEntry[],
  spec: ContentQuerySpec = {},
): ContentQueryPage {
  const ordered = queryContentEntries(entries, {
    filter: spec.filter,
    sort: spec.sort,
  });
  const page = resolveContentQueryPagination(ordered.length, spec);
  const end = page.limit > 0 ? page.offset + page.limit : undefined;
  return { entries: ordered.slice(page.offset, end), page };
}

export function resolveContentQueryPagination(
  total: number,
  spec: Pick<ContentQuerySpec, "offset" | "limit"> = {},
): ContentQueryPagination {
  const limit =
    typeof spec.limit === "number" &&
    Number.isFinite(spec.limit) &&
    spec.limit > 0
      ? Math.floor(spec.limit)
      : 0;
  const offset =
    typeof spec.offset === "number" &&
    Number.isFinite(spec.offset) &&
    spec.offset > 0
      ? Math.floor(spec.offset)
      : 0;
  const pageCount = limit > 0 ? Math.ceil(total / limit) : total > 0 ? 1 : 0;
  const page = limit > 0 ? Math.floor(offset / limit) + 1 : 1;

  return {
    offset,
    limit,
    total,
    page,
    pageCount,
    hasPrevious: offset > 0,
    hasNext: limit > 0 ? offset + limit < total : false,
  };
}

export function matchesFilter(
  entry: ContentManifestEntry,
  filter: ContentQueryFilter,
): boolean {
  return (
    matchesTags(entry.tags, filter.tags) &&
    matchesFolder(entry.slug, filter.folder) &&
    matchesFrontmatter(entry.frontmatter, filter.frontmatter) &&
    matchesDate(entry.frontmatter, filter.date)
  );
}

export function matchesTags(
  tags: readonly string[],
  filter: ContentQueryTagFilter | undefined,
): boolean {
  if (!filter) return true;

  const normalized = tags.map((tag) => tag.toLowerCase());
  const has = (tag: string) => normalized.includes(tag.toLowerCase());

  if (filter.any && filter.any.length > 0 && !filter.any.some(has)) {
    return false;
  }
  if (filter.all && filter.all.length > 0 && !filter.all.every(has)) {
    return false;
  }
  if (filter.none && filter.none.length > 0 && filter.none.some(has)) {
    return false;
  }
  return true;
}

export function matchesFolder(
  slug: string,
  folder: string | readonly string[] | undefined,
): boolean {
  if (folder === undefined) return true;

  const folders = (Array.isArray(folder) ? folder : [folder])
    .map(normalizeFolder)
    .filter((value) => value.length > 0);
  if (folders.length === 0) return true;

  return folders.some(
    (value) => slug === value || slug.startsWith(`${value}/`),
  );
}

export function normalizeFolder(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, "");
}

export function matchesFrontmatter(
  frontmatter: Readonly<Record<string, unknown>>,
  filter: ContentQueryFrontmatterFilter | undefined,
): boolean {
  if (!filter) return true;

  for (const [key, expected] of Object.entries(filter)) {
    const actual = frontmatter[key];
    const expectedValues = Array.isArray(expected) ? expected : [expected];
    if (expectedValues.length === 0) continue;
    if (
      !expectedValues.some((value) => matchesFrontmatterValue(actual, value))
    ) {
      return false;
    }
  }
  return true;
}

export function matchesFrontmatterValue(
  actual: unknown,
  expected: ContentQueryScalar,
): boolean {
  if (Array.isArray(actual)) {
    return actual.some((item) => scalarEquals(item, expected));
  }
  return scalarEquals(actual, expected);
}

export function scalarEquals(
  actual: unknown,
  expected: ContentQueryScalar,
): boolean {
  if (actual === undefined || actual === null) return false;
  if (typeof actual === "string" && typeof expected === "string") {
    return actual.toLowerCase() === expected.toLowerCase();
  }
  if (actual instanceof Date) {
    const time = toTime(expected);
    return time !== null && actual.getTime() === time;
  }
  return actual === expected;
}

export function matchesDate(
  frontmatter: Readonly<Record<string, unknown>>,
  filter: ContentQueryDateFilter | undefined,
): boolean {
  if (!filter) return true;

  const from = filter.from ? parseLowerBound(filter.from) : null;
  const to = filter.to ? parseUpperBound(filter.to) : null;
  if (from === null && to === null) return true;

  const value = toTime(frontmatter[filter.field ?? "date"]);
  if (value === null) return false;
  if (from !== null && value < from) return false;
  if (to !== null && value > to) return false;
  return true;
}

export function parseLowerBound(value: string): number | null {
  return toTime(value);
}

export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function parseUpperBound(value: string): number | null {
  const time = toTime(
    DATE_ONLY.test(value.trim()) ? `${value.trim()}T23:59:59.999Z` : value,
  );
  return time;
}

export function toTime(value: unknown): number | null {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const time = Date.parse(trimmed);
  return Number.isNaN(time) ? null : time;
}
