/** A Vega-Lite specification parsed from a fenced code block. */
export type VegaLiteSpec = Record<string, unknown>;

/** Colour scheme applied by `vega-embed`. */
export type VegaLiteTheme = "light" | "dark" | "none";

/** Renderer handed to `vega-embed`. */
export type VegaLiteRenderer = "canvas" | "svg";

export type VegaLiteOptions = {
  /** Render the spec title (or code-block title) as a `figcaption`. Defaults to `true`. */
  caption?: boolean;
  /**
   * Show the `vega-embed` actions menu. `true`/`false` force it, `null` (the
   * default) keeps the `vega-embed` default.
   */
  actions?: boolean | null;
  /** Colour scheme for the rendered chart. Defaults to `"light"`. */
  theme?: VegaLiteTheme;
  /** Base class applied to the figure. Defaults to `"rb-vega-lite"`. */
  className?: string;
  /** Renderer used by the Vega runtime. Defaults to `"canvas"`. */
  renderer?: VegaLiteRenderer;
};

export type ElementNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

export type ParentNode = HastNode & {
  children?: HastNode[];
};

export type TextNode = {
  type: "text";
  value: string;
};

export type RawNode = {
  type: "raw";
  value: string;
};

export type HastNode =
  | ElementNode
  | TextNode
  | RawNode
  | { type: string; [key: string]: unknown };
