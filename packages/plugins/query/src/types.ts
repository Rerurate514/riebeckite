import type { ContentQuerySort, ContentQuerySpec } from "@riebeckite/core";

export type QueryOutputFormat = "table" | "list";

export type QuerySpec = ContentQuerySpec & {
  format?: QueryOutputFormat;
  columns?: readonly string[];
  excludeSelf?: boolean;
  empty?: string;
};

export type QueryOptions = {
  className?: string;
  language?: string;
  defaultFormat?: QueryOutputFormat;
  defaultColumns?: readonly string[];
  defaultSort?: ContentQuerySort;
  defaultLimit?: number;
  emptyMessage?: string;
  excludeSelf?: boolean;
};
