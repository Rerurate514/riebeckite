import type { ContentManifestEntry } from "../types/content_manifest.js";
import type {
  ContentQuerySort,
  ContentQuerySortOrder,
} from "./content_query_types.js";

export const TITLE_FIELDS = new Set(["title", "slug", "permalink"]);

export function applySort(
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

export type NormalizedSort = {
  field: string;
  order: ContentQuerySortOrder;
};

export function normalizeSort(
  sort: ContentQuerySort | readonly ContentQuerySort[] | undefined,
): NormalizedSort[] {
  if (!sort) return [];

  const list = Array.isArray(sort) ? sort : [sort];
  return list.map((value) => ({
    field: value.field?.trim() || "date",
    order: value.order === "desc" ? "desc" : "asc",
  }));
}

export function compareEntries(
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

export function resolveSortValue(
  entry: ContentManifestEntry,
  field: string,
): unknown {
  if (!TITLE_FIELDS.has(field)) return entry.frontmatter[field];
  if (field === "title") return entry.title;
  if (field === "slug") return entry.slug;
  return entry.permalink;
}

export function compareValues(left: unknown, right: unknown): number {
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

export function toComparable(value: unknown): string | number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value === undefined || value === null) return "";
  return String(value);
}

export function applyPagination(
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
