export type MarpOptions = {
  /** Marp theme name registered in Marp Core (for example `"default"`, `"gaia"`, `"uncover"`). */
  theme?: string;
  /** Allow raw HTML inside the Marp Markdown (default `true`). */
  allowHtml?: boolean;
  /** Enable Marp math support (default `true`). */
  math?: boolean;
  /** Use inline SVG output for Marp slides when the renderer supports it. */
  inlineSVG?: boolean;
  /** Render the code block title as a caption (default `true`). */
  caption?: boolean;
  /** Wrapper class name (default `"rb-marp"`). */
  className?: string;
};

export type MarpDeck = {
  /** Rendered slide deck markup, including the deck container element. */
  html: string;
  /** Generated Marp CSS for the deck. */
  css: string;
  /** Number of rendered slides. */
  slides: number;
};

export type MarpBuildRenderResult =
  | {
      ok: true;
      deck: MarpDeck;
      /** Non-fatal issue such as an unknown theme that fell back to default. */
      warning?: string;
    }
  | {
      ok: false;
      message: string;
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
