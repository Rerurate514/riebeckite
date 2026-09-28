/**
 * Public types for the Markmap plugin.
 *
 * This module is imported by the build-time transformer, the browser
 * initializer, and the package entry point, so it must stay free of Node-only
 * imports.
 */

/** A node in the notation-neutral mindmap tree. */
export type MarkmapNode = {
  /** Raw (Markdown) content of the node. */
  content: string;
  /** Child nodes, in document order. */
  children: MarkmapNode[];
  /** Extra data reserved for alternative input notations. */
  payload?: Record<string, unknown>;
};

/**
 * Options accepted by the `markmap` plugin factory.
 *
 * Note that client initializers are static, so the resolved values are
 * forwarded to the browser through `data-markmap-*` attributes.
 */
export type MarkmapOptions = {
  /** Render the code-block title as a `<figcaption>`. Defaults to `true`. */
  caption?: boolean;
  /** Canvas height in pixels. Defaults to `320`. */
  height?: number;
  /** Base CSS class applied to the figure. Defaults to `"rb-markmap"`. */
  className?: string;
  /** Fenced-code language to recognize. Defaults to `"markmap"`. */
  language?: string;
  /** Render a `<details>` block holding the raw Markdown. Defaults to `true`. */
  fallback?: boolean;
  /**
   * Depth at which node colours are frozen, forwarded to `markmap-view`.
   * Omission keeps the `markmap-view` default.
   */
  colorFreezeLevel?: number;
};

/** Options after defaults have been applied. */
export type MarkmapResolvedOptions = {
  caption: boolean;
  height: number;
  className: string;
  language: string;
  fallback: boolean;
  colorFreezeLevel: number | null;
};

/** Options accepted by `initMarkmap` when called programmatically. */
export type MarkmapClientOptions = {
  /** Base class used to find figures. Defaults to `"rb-markmap"`. */
  className?: string;
  /** ESM URL of `markmap-lib`. Defaults to the pinned jsDelivr build. */
  libUrl?: string;
  /** ESM URL of `markmap-view`. Defaults to the pinned jsDelivr build. */
  viewUrl?: string;
  /** Preloaded runtime, used to skip the CDN import. */
  runtime?: MarkmapRuntime;
};

/** The subset of `markmap-common`'s `IPureNode` the renderer relies on. */
export type MarkmapPureNode = {
  content: string;
  children: MarkmapPureNode[];
  payload?: Record<string, unknown>;
};

/** Result of `markmap-lib`'s `Transformer#transform`. */
export type MarkmapTransformResult = {
  root: MarkmapPureNode;
  features: Record<string, boolean>;
  frontmatter?: { markmap?: Record<string, unknown> };
};

/** Assets reported by `markmap-lib` for a set of used features. */
export type MarkmapAssets = {
  styles?: unknown[];
  scripts?: unknown[];
};

/** The `markmap-lib` surface the initializer uses. */
export type MarkmapTransformer = {
  transform(source: string): MarkmapTransformResult;
  getUsedAssets(features: Record<string, boolean>): MarkmapAssets;
};

/** The `markmap-view` surface the initializer uses. */
export type MarkmapRuntime = {
  Transformer: new () => MarkmapTransformer;
  Markmap: {
    create(
      svg: SVGElement,
      options: Record<string, unknown>,
      root: MarkmapPureNode,
    ): unknown;
  };
  deriveOptions?: (options: Record<string, unknown>) => Record<string, unknown>;
  loadJS?: (items: unknown[]) => Promise<void>;
  loadCSS?: (items: unknown[]) => Promise<void>;
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
