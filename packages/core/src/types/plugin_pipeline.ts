import type { Plugin } from "unified";
import type { Node } from "unist";
import type { PluginRenderInput } from "./plugin_context";

export type PipelinePlugin = Plugin<[unknown?], Node, Node>;

export type MarkdownPipeline = {
  use(plugin: PipelinePlugin, options?: unknown): void;
};

export type HtmlPipeline = MarkdownPipeline;

export type MarkdownPipelineContext = {
  contentIndex: Map<string, string>;
  renderNoteEmbed?: (
    slug: string,
    fragment: MarkdownEmbedFragment | null,
  ) => Promise<string | null>;
  renderContent?: (input: PluginRenderInput) => Promise<string | null>;
};

export type MarkdownEmbedFragment = {
  kind: "heading" | "block";
  value: string;
};
