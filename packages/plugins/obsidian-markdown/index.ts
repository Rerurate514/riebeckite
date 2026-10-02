import {
  definePlugin,
  isImagePath,
  normalizeContentPath,
  readContentSourceEntry,
} from "@riebeckite/core";
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
  const emittedImagePaths = new Set<string>();

  return definePlugin({
    name: PLUGIN_NAME,
    order: -20,
    processedContentCache: {
      version: "obsidian-markdown-v1",
      dependencyMode: "tracked",
    },
    options,
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
    buildEnd: async (context) => {
      const source = context.contentSource;
      if (!source) return;

      const publicImagePaths = new Set(
        context.manifest.publicEntries.flatMap((entry) =>
          entry.assets
            .map((asset) => normalizeContentPath(asset.path))
            .filter(isImagePath),
        ),
      );

      for (const imagePath of publicImagePaths) {
        if (emittedImagePaths.has(imagePath)) continue;
        const content = await readContentSourceEntry(source, imagePath);
        if (content === null) continue;
        context.output.emit({
          path: imagePath,
          content,
          dependencies: [{ type: "global" }],
        });
        emittedImagePaths.add(imagePath);
      }
    },
  });
}

export const obsidianMarkdownPlugin = obsidianMarkdown;
