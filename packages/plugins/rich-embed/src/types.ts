/**
 * Providers that `richEmbed()` can recognise from a URL alone. Detection never
 * performs a network request; it only inspects the parsed https URL.
 */
export type RichEmbedProvider =
  | "youtube"
  | "vimeo"
  | "spotify"
  | "codepen"
  | "gist"
  | "generic";

export type RichEmbedOptions = {
  /**
   * Hostnames (exact match, case-insensitive) allowed to fall back to a generic
   * `<iframe>` when no built-in provider recognises the URL. Empty by default,
   * so unknown hosts are never embedded.
   */
  allowHosts?: readonly string[];
  /**
   * Allowlist of providers to enable. When omitted, every provider is enabled.
   */
  providers?: readonly RichEmbedProvider[];
  /**
   * Providers to disable. Takes precedence over `providers`.
   */
  disable?: readonly RichEmbedProvider[];
};

/** Options parsed from the lines that follow the URL in an `embed` fence. */
export type RichEmbedBlockOptions = {
  title?: string;
  caption?: string;
  aspect?: string;
  start?: number;
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
