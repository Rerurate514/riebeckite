export type GraphvizRenderMode = "build" | "client" | "both";

export const GRAPHVIZ_ENGINES = [
  "dot",
  "neato",
  "fdp",
  "sfdp",
  "circo",
  "twopi",
] as const;

export type GraphvizEngine = (typeof GRAPHVIZ_ENGINES)[number];

export type GraphvizOptions = {
  /** Where the SVG is produced. Defaults to `"build"`. */
  render?: GraphvizRenderMode;
  /** Graphviz layout engine. Defaults to `"dot"`. */
  engine?: GraphvizEngine;
  /** Render a `<figcaption>` from the code block title / caption comment. */
  caption?: boolean;
  /** Render a `<details>` block exposing the DOT source. */
  fallback?: boolean;
  /** Base class name applied to the `<figure>`. Defaults to `"rb-graphviz"`. */
  className?: string;
};

export type GraphvizBuildRenderErrorKind = "invalid-diagram" | "renderer-error";

export type GraphvizBuildRenderResult =
  | {
      ok: true;
      svg: string;
    }
  | {
      ok: false;
      kind: GraphvizBuildRenderErrorKind;
      message: string;
    };

export type GraphvizClientOptions = {
  engine?: GraphvizEngine;
  className?: string;
  renderer?: GraphvizRenderer;
  scriptUrl?: string;
};

export type GraphvizRenderer = {
  renderString(
    source: string,
    options: { format: "svg"; engine: string },
  ): string;
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
