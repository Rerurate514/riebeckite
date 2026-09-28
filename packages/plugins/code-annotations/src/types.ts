export type CodeAnnotationsOptions = {
  /**
   * Class applied to the code block root (`<pre>` or the
   * `rehype-pretty-code` `<figure>`). Defaults to `"rb-code"`.
   */
  className?: string;
  /**
   * Class applied to each generated line wrapper. Defaults to
   * `"rb-code__line"`. Existing line wrappers are not re-classed.
   */
  lineClassName?: string;
  /** Class applied to highlighted lines. Defaults to `"rb-code__line--highlighted"`. */
  highlightClassName?: string;
  /** Class applied to `++` lines. Defaults to `"rb-code__line--added"`. */
  addedClassName?: string;
  /** Class applied to `--` lines. Defaults to `"rb-code__line--removed"`. */
  removedClassName?: string;
  /** Class applied to focused lines. Defaults to `"rb-code__line--focused"`. */
  focusClassName?: string;
  /**
   * When set, annotations are only applied to code blocks whose detected
   * language matches this value. Unset by default.
   */
  language?: string;
};

export type ResolvedCodeAnnotationsOptions = {
  className: string;
  lineClassName: string;
  highlightClassName: string;
  addedClassName: string;
  removedClassName: string;
  focusClassName: string;
  language?: string;
};

export type CodeAnnotationPlan = {
  highlight: number[];
  added: number[];
  removed: number[];
  focus: number[];
};

export type CodeAnnotationKind = "highlight" | "added" | "removed" | "focus";

export type ElementNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  data?: Record<string, unknown>;
  children?: HastNode[];
};

export type TextNode = {
  type: "text";
  value: string;
};

export type HastNode =
  | ElementNode
  | TextNode
  | { type: string; [key: string]: unknown };
