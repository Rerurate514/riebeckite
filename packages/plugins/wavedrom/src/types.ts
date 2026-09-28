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

/** A WaveDrom skin shipped by the `wavedrom` package. */
export type WavedromSkin = "default" | "narrow" | "lowkey";

export type WavedromOptions = {
  /**
   * WaveDrom skin used by the browser renderer. The value is forwarded to the
   * client through a `data-wavedrom-skin` attribute because client entry code
   * cannot see plugin options. Defaults to `"default"`.
   */
  skin?: WavedromSkin;
  /** Render the extracted caption as a `<figcaption>`. Defaults to `true`. */
  caption?: boolean;
  /** Render a `<details>` block containing the WaveJSON source. Defaults to `true`. */
  fallback?: boolean;
  /** Base CSS class for the generated figure. Defaults to `"rb-wavedrom"`. */
  className?: string;
};
