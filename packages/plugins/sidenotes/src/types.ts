/** Options accepted by `sidenotes()`. */
export type SidenotesOptions = {
  /**
   * Extra CSS class appended to each sidenote root, on top of
   * `rr-sidenotes__note` and the popover modifier. Defaults to none.
   */
  className?: string;
  /**
   * Accessible name prefix for each sidenote. The rendered label is
   * `"${ariaLabel} ${index}"`. Defaults to `"Sidenote"`.
   */
  ariaLabel?: string;
  /**
   * Accessible label prefix for a reference link while its mobile popover is
   * closed. The rendered label is `"${openLabel} ${index}"`. Defaults to
   * `"Footnote"`.
   */
  openLabel?: string;
  /**
   * Accessible label prefix for a reference link while its mobile popover is
   * open. The rendered label is `"${closeLabel} ${index}"`. Defaults to
   * `"Close sidenote"`.
   */
  closeLabel?: string;
  /**
   * Where the mobile popover is anchored. Defaults to `"bottom"` (a bottom
   * sheet); `"end"` is a right-edge panel.
   */
  popoverAlignment?: "bottom" | "end";
};

/** `SidenotesOptions` with every default applied. */
export type ResolvedSidenotesOptions = {
  className: string;
  ariaLabel: string;
  openLabel: string;
  closeLabel: string;
  popoverAlignment: "bottom" | "end";
};

/** Minimal hast element shape the sidenotes transformer reads and emits. */
export type HastElementNode = {
  type: "element";
  tagName: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

export type HastTextNode = { type: "text"; value: string };

/** A raw HTML fragment emitted by the plugin and serialized verbatim. */
export type HastRawNode = { type: "raw"; value: string };

export type HastCommentNode = { type: "comment"; value: string };

export type HastDoctypeNode = { type: "doctype"; name?: string };

export type HastRootNode = { type: "root"; children?: HastNode[] };

/** Any node the sidenotes transformer may encounter in a hast tree. */
export type HastNode =
  | HastElementNode
  | HastTextNode
  | HastRawNode
  | HastCommentNode
  | HastDoctypeNode
  | HastRootNode;
