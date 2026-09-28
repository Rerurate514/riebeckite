import type { ContentManifestEntry } from "../types/content_manifest.js";
import {
  type ContentQueryFilter,
  type ContentQueryGroupBy,
  type ContentQuerySort,
  type ContentQuerySortOrder,
  groupContentEntries,
} from "./content_query.js";

/**
 * Context passed to the optional title/path builders of a collection
 * definition. `value` is the raw group key (for example `Log/Article` or
 * `2025-12`), not a URL.
 */
export type ContentCollectionContext = {
  kind: string;
  value: string;
  basePath: string;
};

/**
 * Declarative definition of a taxonomy or archive. A definition groups
 * resolved manifest entries, maps every group to a site-local listing path,
 * and optionally names the collection.
 */
export type ContentCollectionDefinition = {
  /** Stable identifier copied onto every generated collection. */
  kind: string;
  /** How entries are grouped (tags, folder, date, or a frontmatter field). */
  groupBy: ContentQueryGroupBy;
  /** Site-local path prefix for the listing pages, for example `/tags`. */
  basePath: string;
  /** Optional filter applied before grouping. */
  filter?: ContentQueryFilter;
  /** Optional sort applied before grouping and inside each listing. */
  sort?: ContentQuerySort | readonly ContentQuerySort[];
  /** Optional ordering of the generated group keys. Defaults to ascending. */
  order?: ContentQuerySortOrder;
  /**
   * Optional display title. Defaults to the raw group value.
   */
  resolveTitle?: (context: ContentCollectionContext) => string;
  /**
   * Optional site-local path builder. Defaults to `basePath` plus a slugified
   * group value, so `Log/Article` under `/tags` becomes `/tags/log/article`.
   */
  resolvePath?: (context: ContentCollectionContext) => string;
};

/**
 * A single generated listing page: one taxonomy value, archive period, or
 * folder, together with the entries it lists in resolved query order.
 */
export type ContentCollection = {
  kind: string;
  value: string;
  title: string;
  path: string;
  entries: ContentManifestEntry[];
};

/**
 * Builds listing collections from resolved manifest entries and declarative
 * definitions. It applies the same query engine as `queryContentEntries`, so
 * links inside a listing use the resolved `permalink`.
 */
export function buildContentCollections(
  entries: readonly ContentManifestEntry[],
  definitions: readonly ContentCollectionDefinition[],
): ContentCollection[] {
  const collections: ContentCollection[] = [];

  for (const definition of definitions) {
    const basePath = normalizeBasePath(definition.basePath);
    const groups = groupContentEntries(entries, definition.groupBy, {
      filter: definition.filter,
      sort: definition.sort,
      order: definition.order,
    });

    for (const group of groups) {
      const context: ContentCollectionContext = {
        kind: definition.kind,
        value: group.key,
        basePath,
      };
      collections.push({
        kind: definition.kind,
        value: group.key,
        title: definition.resolveTitle?.(context) ?? group.key,
        path: normalizePath(
          definition.resolvePath?.(context) ?? defaultPath(context),
        ),
        entries: group.entries,
      });
    }
  }

  return collections;
}

function defaultPath(context: ContentCollectionContext): string {
  const slug = slugifyValue(context.value);
  if (!slug) return context.basePath || "/";
  return `${context.basePath}/${slug}`;
}

function slugifyValue(value: string): string {
  return value
    .split("/")
    .map((segment) =>
      segment
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .filter((segment) => segment.length > 0)
    .join("/");
}

function normalizeBasePath(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (trimmed.length === 0) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function normalizePath(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "/";
  const absolute = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return absolute.replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";
}
