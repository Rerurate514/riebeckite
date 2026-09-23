import type { Plugin } from "unified";
import type { Node } from "unist";

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
  renderAttachment?: (input: {
    path: string;
    raw: string;
    label: string;
    url: string;
    embed: boolean;
  }) => Promise<string | null>;
};

export type MarkdownEmbedFragment = {
  kind: "heading" | "block";
  value: string;
};
