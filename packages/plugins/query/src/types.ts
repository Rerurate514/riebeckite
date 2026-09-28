import type { ContentQuerySort, ContentQuerySpec } from "@riebeckite/core";

export type QueryOutputFormat = "table" | "list";

/**
 * A parsed `query` code block. It extends the Core query spec with
 * presentation-only fields; the latter never reach `queryContentEntries`.
 */
export type QuerySpec = ContentQuerySpec & {
  /** Render as a table or a list. Defaults to the plugin option. */
  format?: QueryOutputFormat;
  /**
   * Table columns. Presets (`title`, `date`, `updated`, `created`,
   * `published`, `tags`, `description`, `permalink`) or frontmatter keys.
   */
  columns?: readonly string[];
  /** Exclude the page that hosts the query from its own results. */
  excludeSelf?: boolean;
  /** Message shown when nothing matches. Overrides the plugin option. */
  empty?: string;
};

export type QueryOptions = {
  /** Root CSS class. Defaults to `rr-query`. */
  className?: string;
  /** Fenced code block language. Defaults to `query`. */
  language?: string;
  /** Output format when a block does not set `format`. Defaults to `table`. */
  defaultFormat?: QueryOutputFormat;
  /** Columns when a block does not set `columns`. */
  defaultColumns?: readonly string[];
  /** Sort applied when a block does not set `sort`. */
  defaultSort?: ContentQuerySort;
  /** Row cap applied when a block does not set `limit`. */
  defaultLimit?: number;
  /** Empty-state message. Defaults to `No matching content.` */
  emptyMessage?: string;
  /** Exclude the host page by default. Defaults to `false`. */
  excludeSelf?: boolean;
};
