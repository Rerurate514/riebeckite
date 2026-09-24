export type MermaidRenderMode = "build" | "client" | "both";

export type MermaidTheme =
  | string
  | {
      light: string;
      dark: string;
    };

export type MermaidOptions = {
  render?: MermaidRenderMode;
  theme?: MermaidTheme;
  caption?: boolean;
  fallback?: boolean;
};

export type MermaidBuildRenderErrorKind = "invalid-diagram" | "renderer-error";

export type MermaidBuildRenderResult =
  | {
      ok: true;
      svg: string;
    }
  | {
      ok: false;
      kind: MermaidBuildRenderErrorKind;
      message: string;
    };

export type MermaidClientOptions = {
  theme?: MermaidTheme;
  mermaid?: MermaidApi;
  scriptUrl?: string;
};

export type MermaidApi = {
  initialize(options: Record<string, unknown>): void;
  render(
    id: string,
    source: string,
  ): Promise<{ svg: string }> | { svg: string };
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
