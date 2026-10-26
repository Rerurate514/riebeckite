/** Options accepted by `sidenotes()`. */
export type SidenotesOptions = {
  /**
   * Extra CSS class appended to each margin note root, on top of
   * `rr-sidenotes__note`. Ignored when `placement` is `"end"`.
   */
  className?: string;
  /**
   * Accessible name prefix for each margin note. The rendered label is
   * `"${ariaLabel} ${index}"`. Ignored when `placement` is `"end"`.
   */
  ariaLabel?: string;
  /**
   * Accessible label prefix for a reference link. The rendered label is
   * `"${openLabel} ${index}"`. Defaults to `"Footnote"`.
   */
  openLabel?: string;
  /**
   * Where footnote definitions render. `"end"` keeps the GFM footnote list at
   * the end of the article and only styles the references. `"margin"` moves
   * each definition next to its reference as a margin note. Defaults to
   * `"end"`.
   */
  placement?: "end" | "margin";
};

/** `SidenotesOptions` with every default applied. */
export type ResolvedSidenotesOptions = {
  className: string;
  ariaLabel: string;
  openLabel: string;
  placement: "end" | "margin";
};

/** Minimal hast element shape the sidenotes transformer reads and emits. */
export type HastElementNode = {
  type: "element";
  tagName: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

type HastTextNode = { type: "text"; value: string };

/** A raw HTML fragment emitted by the plugin and serialized verbatim. */
export type HastRawNode = { type: "raw"; value: string };

type HastCommentNode = { type: "comment"; value: string };

type HastDoctypeNode = { type: "doctype"; name?: string };

type HastRootNode = { type: "root"; children?: HastNode[] };

/** Any node the sidenotes transformer may encounter in a hast tree. */
export type HastNode =
  | HastElementNode
  | HastTextNode
  | HastRawNode
  | HastCommentNode
  | HastDoctypeNode
  | HastRootNode;
