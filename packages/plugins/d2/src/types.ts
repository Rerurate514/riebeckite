export type D2RenderMode = "build" | "client" | "both";

export type D2Layout = "dagre" | "elk";

/**
 * D2 theme id, or a light/dark pair of theme ids. D2's default theme is `0`;
 * `1` is the built-in dark theme.
 */
export type D2Theme =
  | number
  | {
      light: number;
      dark: number;
    };

export type D2Options = {
  render?: D2RenderMode;
  theme?: D2Theme;
  layout?: D2Layout;
  caption?: boolean;
  fallback?: boolean;
  /** Base CSS class for the generated figure. Defaults to `"rb-d2"`. */
  className?: string;
};

export type D2BuildRenderErrorKind = "invalid-diagram" | "renderer-error";

export type D2BuildRenderResult =
  | {
      ok: true;
      svg: string;
    }
  | {
      ok: false;
      kind: D2BuildRenderErrorKind;
      message: string;
    };

/**
 * Minimal structural surface of the D2.js instance used by the browser
 * initializer. Declaring it locally keeps `@d2lang/d2` out of the published
 * type surface.
 */
export type D2InstanceApi = {
  compile(
    source: string,
    options?: Record<string, unknown>,
  ): Promise<{
    diagram: unknown;
    renderOptions?: Record<string, unknown>;
  }>;
  render(
    diagram: unknown,
    options?: Record<string, unknown>,
  ): Promise<string> | string;
  dispose?(): Promise<void> | void;
};

export type D2ModuleApi = {
  D2: new () => D2InstanceApi;
};

export type D2ClientOptions = {
  theme?: D2Theme;
  layout?: D2Layout;
  /** A preloaded D2.js module. When omitted, `moduleUrl` is imported. */
  api?: D2ModuleApi;
  /** ESM URL used to load D2.js in the browser. */
  moduleUrl?: string;
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
