import type { ContentManifestEntry } from "../types/content_manifest.js";
import type { ContentLocalePolicy } from "./content_language.js";

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
  locale?: ContentLocalePolicy;
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

export type ContentQueryPagination = {
  /** Number of entries skipped from the start. */
  offset: number;
  /** Entries per page; `0` means pagination is disabled. */
  limit: number;
  /** Total number of entries before pagination. */
  total: number;
  /** 1-based page number for the resolved offset. */
  page: number;
  /** Total number of pages (`0` when there are no entries). */
  pageCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

export type ContentQueryPage = {
  entries: ContentManifestEntry[];
  page: ContentQueryPagination;
};

export type ContentQueryDateGranularity = "year" | "month" | "day";

export type ContentQueryGroupBy =
  | { by: "tags" }
  | { by: "folder"; depth?: number }
  | {
      by: "date";
      field?: string;
      fields?: readonly string[];
      granularity?: ContentQueryDateGranularity;
    }
  | { by: "frontmatter"; field: string };

export type ContentQueryGroup = {
  key: string;
  entries: ContentManifestEntry[];
};

export type ContentQueryGroupOptions = {
  filter?: ContentQueryFilter;
  locale?: ContentLocalePolicy;
  sort?: ContentQuerySort | readonly ContentQuerySort[];
  order?: ContentQuerySortOrder;
};
