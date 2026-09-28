export type PlantumlFormat = "svg" | "png";

export type PlantumlOptions = {
  /**
   * Base URL of the PlantUML server used to render diagrams.
   * Must be an `http(s)` URL so the generated `<img>` can load it.
   * @default "https://www.plantuml.com/plantuml"
   */
  server?: string;
  /**
   * Output format requested from the PlantUML server.
   * @default "svg"
   */
  format?: PlantumlFormat;
  /**
   * Show the `%% caption:` line or code block title as a `figcaption`.
   * @default true
   */
  caption?: boolean;
  /**
   * Keep the original diagram source in a `<details>` element.
   * @default true
   */
  fallback?: boolean;
};

export type PlantumlErrorKind = "empty-source" | "encoder-error";

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
