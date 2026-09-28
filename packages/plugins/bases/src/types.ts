import type { ContentQuerySort } from "@riebeckite/core";

/** View kinds supported by the MVP renderer. */
export type BasesViewType = "table" | "cards";

/** Scalar literal that can appear on the right-hand side of a comparison. */
export type BasesLiteral = string | number | boolean | null;

/** Comparison operators supported in filter expressions. */
export type BasesOperator =
  | "=="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "contains";

/** Built-in `file.*` values exposed to filter expressions. */
export type BasesBuiltinValue =
  | "file.name"
  | "file.path"
  | "file.slug"
  | "file.folder"
  | "file.title"
  | "file.link"
  | "file.permalink"
  | "file.tags";

/** A value read either from a built-in or from frontmatter. */
export type BasesValueRef =
  | { readonly source: "builtin"; readonly name: BasesBuiltinValue }
  | { readonly source: "frontmatter"; readonly key: string };

/**
 * A compiled Base filter condition. The tree mirrors the `and` / `or` / `not`
 * shape of an Obsidian Base and is evaluated against manifest entries.
 */
export type BasesCondition =
  | { readonly kind: "and"; readonly conditions: readonly BasesCondition[] }
  | { readonly kind: "or"; readonly conditions: readonly BasesCondition[] }
  | { readonly kind: "not"; readonly condition: BasesCondition }
  | { readonly kind: "hasTag"; readonly tag: string }
  | { readonly kind: "inFolder"; readonly folder: string }
  | { readonly kind: "hasLink"; readonly link: string }
  | {
      readonly kind: "compare";
      readonly left: BasesValueRef;
      readonly operator: BasesOperator;
      readonly right: BasesLiteral;
    };

/** A compiled Base view. */
export type BasesView = {
  readonly type: BasesViewType;
  /** Optional human-readable label; rendered above the view output. */
  readonly name?: string;
  /** Property ids used as table columns (or card fields). */
  readonly columns: readonly string[];
  /** View-local filter, combined with the top-level filter using AND. */
  readonly filter?: BasesCondition;
  /** Sort keys, mapped onto the Core content query sort shape. */
  readonly sort?: readonly ContentQuerySort[];
  /** View-local row cap. Still bounded by {@link BasesOptions.limit}. */
  readonly limit?: number;
};

/** A compiled Base definition. */
export type BasesSpec = {
  /** Top-level filter applied to every view. */
  readonly filter?: BasesCondition;
  /** Property id -> display label. */
  readonly properties: Readonly<Record<string, string>>;
  readonly views: readonly BasesView[];
};

export type BasesOptions = {
  /** Root CSS class. Defaults to `rb-bases`. */
  className?: string;
  /** Fenced code block language. Defaults to `base`. */
  language?: string;
  /** Global row cap applied to every view. Defaults to `100`. */
  limit?: number;
  /** Render the raw Base definition in a `<details>` fallback. Defaults to `true`. */
  showFallback?: boolean;
  /**
   * Name of the single view to render when a Base defines several. When unset,
   * every view is rendered as a labelled section.
   */
  view?: string;
};
