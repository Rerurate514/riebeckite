import { createStyleAsset, definePlugin } from "@riebeckite/core";
import { remarkObsidianBlockReference } from "./src/remark_obsidian_block_reference.js";
import {
  type CalloutOptions,
  remarkObsidianCallout,
} from "./src/remark_obsidian_callout.js";
import {
  remarkObsidianTag,
  type TagOptions,
} from "./src/remark_obsidian_tag.js";
import { remarkObsidianWikilink } from "./src/remark_obsidian_wikilink.js";

export type { CalloutOptions } from "./src/remark_obsidian_callout.js";
export type { TagOptions } from "./src/remark_obsidian_tag.js";
export type {
  WikilinkFragment,
  WikilinkOptions,
} from "./src/remark_obsidian_wikilink.js";

export type ObsidianMarkdownOptions = {
  assetBase?: string;
  callout?: CalloutOptions;
  tag?: TagOptions;
};

const PLUGIN_NAME = "obsidian-markdown";

export function obsidianMarkdown(options: ObsidianMarkdownOptions = {}) {
  return definePlugin({
    name: PLUGIN_NAME,
    order: -20,
    processedContentCache: {
      version: "obsidian-markdown-v2",
      dependencyMode: "tracked",
    },
    options,
    assets: [createStyleAsset(PLUGIN_NAME)],
    extendMarkdownPipeline: (pipeline, context) => {
      pipeline.use(remarkObsidianBlockReference);
      pipeline.use(remarkObsidianWikilink, {
        contentIndex: context.contentIndex,
        resolvePermalink: context.resolvePermalink,
        isRoutable: context.isRoutable,
        assetBase: options.assetBase,
        renderNoteEmbed: context.renderNoteEmbed,
        renderContent: context.renderContent,
      });
      pipeline.use(remarkObsidianCallout, options.callout);
      pipeline.use(remarkObsidianTag, options.tag);
    },
  });
}

export const obsidianMarkdownPlugin = obsidianMarkdown;
