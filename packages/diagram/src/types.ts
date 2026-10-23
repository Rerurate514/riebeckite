import type { ConfigValidationIssue, RiebeckitePlugin } from "@riebeckite/core";

export type DiagramNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: DiagramNode[];
  value?: string;
  [key: string]: unknown;
};

export type DiagramBlock = {
  pre: DiagramNode;
  code: DiagramNode;
  parent: DiagramNode;
  index: number;
  source: string;
  language: string;
};

export type DiagramCaptionStrategy = (
  block: DiagramBlock,
) => string | null | undefined;

export type DiagramContent =
  | { kind: "svg"; svg: string }
  | { kind: "canvas"; attrs?: Record<string, string> }
  | { kind: "image"; src: string; alt?: string };

export type DiagramFigureInput = {
  className: string;
  id: string;
  source: string;
  caption?: string | null;
  label: string;
  content: DiagramContent;
  fallback?: boolean;
  fallbackLabel?: string;
  status: "pending" | "rendered" | "error";
  kind: string;
  attributes?: Record<string, string | undefined>;
};

export type DiagramErrorKind =
  | "invalid-diagram"
  | "renderer-error"
  | "timeout"
  | "aborted";

export type DiagramBuildResult =
  | { ok: true; svg: string }
  | { ok: false; kind: DiagramErrorKind; message: string; retryable?: boolean };

export type DiagramBuildRenderer<TResource = undefined> = (
  source: string,
  context: { id: string; theme?: string; signal: AbortSignal },
  resource: TResource,
) => Promise<DiagramBuildResult>;

export type DiagramSession = {
  render(
    source: string,
    context: { id: string; theme?: string; signal?: AbortSignal },
  ): Promise<DiagramBuildResult>;
  dispose(): Promise<void>;
};

export type DiagramRenderMode = "build" | "client" | "both";

export type DiagramPluginDefinition<TOptions> = {
  name: string;
  order?: number;
  options?: TOptions;
  processedContentCache: NonNullable<RiebeckitePlugin["processedContentCache"]>;
  validateOptions?: (
    options: TOptions | undefined,
  ) => readonly ConfigValidationIssue[];
  rehype: (options: TOptions | undefined) => unknown;
  style?: string;
  client?: { moduleSpecifier: string; exportName: string };
};
