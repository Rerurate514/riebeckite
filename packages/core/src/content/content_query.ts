import type { ContentManifestEntry } from "../types/content_manifest.js";

export type ContentQueryScalar = string | number | boolean;

export type ContentQueryTagFilter = {
  any?: readonly string[];
  all?: readonly string[];
  none?: readonly string[];
};

export type ContentQueryFrontmatterFilter = Record<
  string,
  ContentQueryScalar | readonly ContentQueryScalar[]
>;

export type ContentQueryDateFilter = {
  field?: string;
  from?: string;
  to?: string;
};

export type ContentQueryFilter = {
  tags?: ContentQueryTagFilter;
  folder?: string | readonly string[];
  frontmatter?: ContentQueryFrontmatterFilter;
  date?: ContentQueryDateFilter;
};

export type ContentQuerySortOrder = "asc" | "desc";

export type ContentQuerySort = {
  field?: string;
  order?: ContentQuerySortOrder;
};

export type ContentQuerySpec = {
  filter?: ContentQueryFilter;
  sort?: ContentQuerySort | readonly ContentQuerySort[];
  limit?: number;
  offset?: number;
};

export type ContentQueryDateGranularity = "year" | "month" | "day";

export type ContentQueryGroupBy =
  | { by: "tags" }
  | { by: "folder"; depth?: number }
  | { by: "date"; field?: string; granularity?: ContentQueryDateGranularity }
  | { by: "frontmatter"; field: string };

export type ContentQueryGroup = {
  key: string;
  entries: ContentManifestEntry[];
};

export type ContentQueryGroupOptions = {
  filter?: ContentQueryFilter;
  sort?: ContentQuerySort | readonly ContentQuerySort[];
  order?: ContentQuerySortOrder;
};

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
    if (
      !expectedValues.some((value) => matchesFrontmatterValue(actual, value))
    ) {
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
  const time = toTime(
    DATE_ONLY.test(value.trim()) ? `${value.trim()}T23:59:59.999Z` : value,
  );
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

function resolveSortValue(entry: ContentManifestEntry, field: string): unknown {
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

export function groupContentEntries(
  entries: readonly ContentManifestEntry[],
  groupBy: ContentQueryGroupBy,
  options: ContentQueryGroupOptions = {},
): ContentQueryGroup[] {
  const matched = queryContentEntries(entries, {
    filter: options.filter,
    sort: options.sort,
  });
  const groups = new Map<string, ContentManifestEntry[]>();

  for (const entry of matched) {
    for (const key of resolveGroupKeys(entry, groupBy)) {
      appendGroup(groups, key, entry);
    }
  }

  return [...groups.entries()]
    .sort(([left], [right]) =>
      options.order === "desc"
        ? right.localeCompare(left, "en")
        : left.localeCompare(right, "en"),
    )
    .map(([key, groupEntries]) => ({ key, entries: groupEntries }));
}

function appendGroup(
  groups: Map<string, ContentManifestEntry[]>,
  key: string,
  entry: ContentManifestEntry,
): void {
  const values = groups.get(key);
  if (values) {
    values.push(entry);
  } else {
    groups.set(key, [entry]);
  }
}

function resolveGroupKeys(
  entry: ContentManifestEntry,
  groupBy: ContentQueryGroupBy,
): string[] {
  switch (groupBy.by) {
    case "tags":
      return [...entry.tags];
    case "folder":
      return resolveFolderKeys(entry.slug, groupBy.depth);
    case "date":
      return resolveDateKeys(
        entry.frontmatter[groupBy.field ?? "date"],
        groupBy.granularity ?? "month",
      );
    case "frontmatter":
      return resolveFrontmatterKeys(entry.frontmatter[groupBy.field]);
    default:
      return [];
  }
}

function resolveFolderKeys(slug: string, depth: number | undefined): string[] {
  const segments = slug.split("/");
  segments.pop();
  const directories =
    typeof depth === "number" && Number.isFinite(depth) && depth > 0
      ? segments.slice(0, Math.floor(depth))
      : segments;
  return [directories.join("/")];
}

const DATE_GRANULARITY_LENGTH: Record<ContentQueryDateGranularity, number> = {
  year: 4,
  month: 7,
  day: 10,
};

function resolveDateKeys(
  value: unknown,
  granularity: ContentQueryDateGranularity,
): string[] {
  const time = toTime(value);
  if (time === null) return [];
  return [
    new Date(time).toISOString().slice(0, DATE_GRANULARITY_LENGTH[granularity]),
  ];
}

function resolveFrontmatterKeys(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? [value.toISOString().slice(0, 10)] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => resolveFrontmatterKeys(item));
  }
  const text = String(value).trim();
  return text.length > 0 ? [text] : [];
}
