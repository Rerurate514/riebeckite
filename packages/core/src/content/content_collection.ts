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
  /** Entries per listing page. Omitted or `0` keeps a single page. */
  pageSize?: number;
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
 * Pagination state of a generated listing page. When `size` is `0`,
 * pagination is disabled and the single page contains every entry.
 */
export type ContentCollectionPage = {
  /** 1-based page number. */
  current: number;
  /** Total number of pages in the collection. */
  count: number;
  /** Entries per page; `0` when pagination is disabled. */
  size: number;
  /** Total number of entries in the collection. */
  total: number;
  /** Site-local path of the previous page, or `null`. */
  previousPath: string | null;
  /** Site-local path of the next page, or `null`. */
  nextPath: string | null;
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
  page: ContentCollectionPage;
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
    const pageSize = normalizePageSize(definition.pageSize);
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
      const title = definition.resolveTitle?.(context) ?? group.key;
      const collectionPath = normalizePath(
        definition.resolvePath?.(context) ?? defaultPath(context),
      );
      const total = group.entries.length;
      const pageCount = pageSize > 0 ? Math.ceil(total / pageSize) : 1;

      for (let index = 0; index < pageCount; index++) {
        const start = pageSize > 0 ? index * pageSize : 0;
        const end = pageSize > 0 ? start + pageSize : undefined;

        collections.push({
          kind: definition.kind,
          value: group.key,
          title,
          path: withPage(collectionPath, index),
          page: {
            current: index + 1,
            count: pageCount,
            size: pageSize,
            total,
            previousPath:
              index > 0 ? withPage(collectionPath, index - 1) : null,
            nextPath:
              index < pageCount - 1
                ? withPage(collectionPath, index + 1)
                : null,
          },
          entries: group.entries.slice(start, end),
        });
      }
    }
  }

  return collections;
}

function normalizePageSize(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

function withPage(path: string, index: number): string {
  if (index === 0) return path;
  const base = path === "/" ? "" : path;
  return normalizePath(`${base}/page/${index + 1}`);
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
