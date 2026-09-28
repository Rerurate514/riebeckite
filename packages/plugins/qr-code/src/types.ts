/** Error-correction level understood by the QR encoder. */
export type QrCodeLevel = "L" | "M" | "Q" | "H";

export type QrCodeOptions = {
  /** Error-correction level. Defaults to `"M"`. */
  level?: QrCodeLevel;
  /** Quiet-zone size in modules. Defaults to `1`. */
  margin?: number;
  /** Rendered width/height in pixels. Defaults to `160`. */
  width?: number;
  /** Alias of `width`; `width` wins when both are present. */
  size?: number;
  /** Dark-module colour. Defaults to `"#000000"`. */
  dark?: string;
  /** Light-module colour. Defaults to `"#ffffff"`. */
  light?: string;
  /** Show a caption from the code-block title or a leading `# caption:` line. Defaults to `true`. */
  caption?: boolean;
  /** CSS class applied to the figure. Defaults to `"rb-qr"`. */
  className?: string;
  /** Fence language that selects the block. Defaults to `"qr"`. */
  language?: string;
  /** Keep the raw source in a collapsible `<details>`. Defaults to `true`. */
  fallback?: boolean;
};

/** `QrCodeOptions` with every field resolved to a concrete value. */
export type ResolvedQrCodeOptions = {
  level: QrCodeLevel;
  margin: number;
  width: number;
  dark: string;
  light: string;
  caption: boolean;
  className: string;
  language: string;
  fallback: boolean;
};

/**
 * Build-time result of encoding a fence body. A failure carries a human
 * readable message; callers decide how to surface it (diagnostic + fallback).
 */
export type QrBuildResult =
  | { ok: true; svg: string }
  | { ok: false; message: string };

export type ElementNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  data?: Record<string, unknown>;
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
