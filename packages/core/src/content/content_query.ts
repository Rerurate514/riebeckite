import type { ContentManifestEntry } from "../types/content_manifest.js";

/**
 * A scalar leaf value accepted in a content query filter. Mirrors the shapes
 * `yaml` produces for frontmatter so queries can be written by hand.
 */
export type ContentQueryScalar = string | number | boolean;

export type ContentQueryTagFilter = {
  /** Entry must carry at least one of these tags. */
  any?: readonly string[];
  /** Entry must carry every one of these tags. */
  all?: readonly string[];
  /** Entry must carry none of these tags. */
  none?: readonly string[];
};

/**
 * Frontmatter equality filter. A scalar expects the entry value to equal it (or
 * to be an array containing it); an array expects any member to match. String
 * comparisons are case-insensitive.
 */
export type ContentQueryFrontmatterFilter = Record<
  string,
  ContentQueryScalar | readonly ContentQueryScalar[]
>;

export type ContentQueryDateFilter = {
  /** Frontmatter field holding the date. Defaults to `date`. */
  field?: string;
  /** Inclusive lower bound. Date-only strings expand to the start of the day. */
  from?: string;
  /** Inclusive upper bound. Date-only strings expand to the end of the day. */
  to?: string;
};

export type ContentQueryFilter = {
  tags?: ContentQueryTagFilter;
  /** Slug prefix, or any of several prefixes. */
  folder?: string | readonly string[];
  frontmatter?: ContentQueryFrontmatterFilter;
  date?: ContentQueryDateFilter;
};

export type ContentQuerySortOrder = "asc" | "desc";

export type ContentQuerySort = {
  /** Frontmatter key, or `title`, `slug`, or `permalink`. Defaults to `date`. */
  field?: string;
  /** Defaults to `asc`. Entries without the field always sort last. */
  order?: ContentQuerySortOrder;
};

export type ContentQuerySpec = {
  filter?: ContentQueryFilter;
  sort?: ContentQuerySort | readonly ContentQuerySort[];
  /** Maximum number of entries to return. */
  limit?: number;
  /** Number of entries to skip after sorting. */
  offset?: number;
};

/**
 * Filters, sorts, and paginates manifest entries for a content query.
 *
 * This is the framework-independent core of the Query plugin (and the seed of
 * the planned Content Query API). It performs no I/O and never mutates its
 * input.
 */
export function queryContentEntries(
  entries: readonly ContentManifestEntry[],
  spec: ContentQuerySpec = {},
): ContentManifestEntry[] {
  const filter = spec.filter ?? {};
  const matched = entries.filter((entry) => matchesFilter(entry, filter));
  const sorted = applySort(matched, spec.sort);
  return applyPagination(sorted, spec.offset, spec.limit);
}

function matchesFilter(
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

function matchesTags(
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

function matchesFolder(
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

function normalizeFolder(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, "");
}

function matchesFrontmatter(
  frontmatter: Readonly<Record<string, unknown>>,
  filter: ContentQueryFrontmatterFilter | undefined,
): boolean {
  if (!filter) return true;

  for (const [key, expected] of Object.entries(filter)) {
    const actual = frontmatter[key];
    const expectedValues = Array.isArray(expected) ? expected : [expected];
    if (expectedValues.length === 0) continue;
    if (!expectedValues.some((value) => matchesFrontmatterValue(actual, value))) {
      return false;
    }
  }
  return true;
}

function matchesFrontmatterValue(
  actual: unknown,
  expected: ContentQueryScalar,
): boolean {
  if (Array.isArray(actual)) {
    return actual.some((item) => scalarEquals(item, expected));
  }
  return scalarEquals(actual, expected);
}

function scalarEquals(actual: unknown, expected: ContentQueryScalar): boolean {
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

function matchesDate(
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

function parseLowerBound(value: string): number | null {
  return toTime(value);
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function parseUpperBound(value: string): number | null {
  const time = toTime(DATE_ONLY.test(value.trim()) ? `${value.trim()}T23:59:59.999Z` : value);
  return time;
}

function toTime(value: unknown): number | null {
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

const TITLE_FIELDS = new Set(["title", "slug", "permalink"]);

function applySort(
  entries: readonly ContentManifestEntry[],
  sort: ContentQuerySort | readonly ContentQuerySort[] | undefined,
): ContentManifestEntry[] {
  const keys = normalizeSort(sort);
  if (keys.length === 0) return [...entries];

  return [...entries].sort((left, right) => {
    for (const key of keys) {
      const result = compareEntries(left, right, key);
      if (result !== 0) return result;
    }
    return 0;
  });
}

type NormalizedSort = {
  field: string;
  order: ContentQuerySortOrder;
};

function normalizeSort(
  sort: ContentQuerySort | readonly ContentQuerySort[] | undefined,
): NormalizedSort[] {
  if (!sort) return [];

  const list = Array.isArray(sort) ? sort : [sort];
  return list.map((value) => ({
    field: value.field?.trim() || "date",
    order: value.order === "desc" ? "desc" : "asc",
  }));
}

function compareEntries(
  left: ContentManifestEntry,
  right: ContentManifestEntry,
  sort: NormalizedSort,
): number {
  const leftValue = resolveSortValue(left, sort.field);
  const rightValue = resolveSortValue(right, sort.field);

  if (leftValue === undefined && rightValue === undefined) return 0;
  if (leftValue === undefined) return 1;
  if (rightValue === undefined) return -1;

  const direction = sort.order === "desc" ? -1 : 1;
  return direction * compareValues(leftValue, rightValue);
}

function resolveSortValue(
  entry: ContentManifestEntry,
  field: string,
): unknown {
  if (!TITLE_FIELDS.has(field)) return entry.frontmatter[field];
  if (field === "title") return entry.title;
  if (field === "slug") return entry.slug;
  return entry.permalink;
}

function compareValues(left: unknown, right: unknown): number {
  const leftComparable = toComparable(left);
  const rightComparable = toComparable(right);

  if (
    typeof leftComparable === "number" &&
    typeof rightComparable === "number"
  ) {
    return leftComparable - rightComparable;
  }
  return String(leftComparable).localeCompare(String(rightComparable), "en");
}

function toComparable(value: unknown): string | number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value === undefined || value === null) return "";
  return String(value);
}

function applyPagination(
  entries: readonly ContentManifestEntry[],
  offset: number | undefined,
  limit: number | undefined,
): ContentManifestEntry[] {
  const start =
    typeof offset === "number" && Number.isFinite(offset) && offset > 0
      ? Math.floor(offset)
      : 0;
  let result = start > 0 ? entries.slice(start) : [...entries];

  if (typeof limit === "number" && Number.isFinite(limit) && limit >= 0) {
    result = result.slice(0, Math.floor(limit));
  }
  return result;
}
