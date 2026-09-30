import type { Plugin } from "unified";
import type { ContentSource } from "../content/content_source.js";
import type { PluginRenderInput } from "./plugin_context.js";

// biome-ignore lint/suspicious/noExplicitAny: Unified plugins define their own option and tree types; the pipeline accepts heterogeneous remark/rehype plugin factories at the boundary.
export type PipelinePlugin = Plugin<any[], any, any>;

export type MarkdownPipeline = {
  use(plugin: PipelinePlugin, options?: unknown): void;
};

export type HtmlPipeline = MarkdownPipeline;

/** Identifies the source being processed by a Markdown pipeline execution. */
export type MarkdownExecutionContext = {
  /** Slug of the content currently being rendered, when available. */
  sourceSlug?: string;
};

export type MarkdownPipelineContext = {
  /** Source identity supplied for this execution, when available. */
  sourceSlug?: MarkdownExecutionContext["sourceSlug"];
  contentIndex: Map<string, string>;
  resolvePermalink: (slug: string) => string;
  renderNoteEmbed?: (
    slug: string,
    fragment: MarkdownEmbedFragment | null,
  ) => Promise<string | null>;
  renderContent?: (input: PluginRenderInput) => Promise<string | null>;
  contentSource?: ContentSource;
};

export type MarkdownEmbedFragment = {
  kind: "heading" | "block";
  value: string;
};
