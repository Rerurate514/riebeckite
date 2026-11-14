import type { ContentManifestEntry } from "../types/content_manifest.js";
import { queryContentEntries, toTime } from "./content_query_filters.js";
import type {
  ContentQueryDateGranularity,
  ContentQueryGroup,
  ContentQueryGroupBy,
  ContentQueryGroupOptions,
} from "./content_query_types.js";

export function groupContentEntries(
  entries: readonly ContentManifestEntry[],
  groupBy: ContentQueryGroupBy,
  options: ContentQueryGroupOptions = {},
): ContentQueryGroup[] {
  const matched = queryContentEntries(entries, {
    filter: options.locale
      ? { ...options.filter, locale: options.locale }
      : options.filter,
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

export function appendGroup(
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

export function resolveGroupKeys(
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
        entry.frontmatter,
        groupBy.fields ?? [groupBy.field ?? "date"],
        groupBy.granularity ?? "month",
      );
    case "frontmatter":
      return resolveFrontmatterKeys(entry.frontmatter[groupBy.field]);
    default:
      return [];
  }
}

export function resolveFolderKeys(
  slug: string,
  depth: number | undefined,
): string[] {
  const segments = slug.split("/");
  segments.pop();
  const directories =
    typeof depth === "number" && Number.isFinite(depth) && depth > 0
      ? segments.slice(0, Math.floor(depth))
      : segments;
  return [directories.join("/")];
}

export const DATE_GRANULARITY_LENGTH: Record<
  ContentQueryDateGranularity,
  number
> = {
  year: 4,
  month: 7,
  day: 10,
};

export function resolveDateKeys(
  frontmatter: Readonly<Record<string, unknown>>,
  fields: readonly string[],
  granularity: ContentQueryDateGranularity,
): string[] {
  for (const field of fields) {
    const time = toTime(frontmatter[field]);
    if (time === null) continue;
    return [
      new Date(time)
        .toISOString()
        .slice(0, DATE_GRANULARITY_LENGTH[granularity]),
    ];
  }
  return [];
}

export function resolveFrontmatterKeys(value: unknown): string[] {
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
