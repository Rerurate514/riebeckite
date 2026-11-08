import { createStyleAsset, definePlugin } from "@riebeckite/core";
import {
  resolveCommentsOptions,
  validateCommentsOptions,
} from "./src/options.js";
import type { CommentsOptions } from "./src/types.js";

export type { CommentsSectionProps } from "./components/comments-section.js";
export { default as CommentsSection } from "./components/comments-section.js";
export {
  DEFAULT_COMMENTS_CLASS_NAME,
  DEFAULT_COMMENTS_EMPTY_TEXT,
  DEFAULT_COMMENTS_HEADING_TEXT,
  DEFAULT_COMMENTS_LIMIT,
  resolveCommentsOptions,
  validateCommentsOptions,
} from "./src/options.js";
export { MemoryCommentsProvider } from "./src/provider.js";
export type {
  CommentsCapability,
  CommentsProvider,
} from "./src/provider.js";
export {
  COMMENTS_ATTRIBUTE,
  COMMENTS_ROOT_CLASS,
  renderCommentsSection,
} from "./src/render.js";
export type {
  Comment,
  CommentAuthor,
  CommentsOptions,
  CommentsPage,
  ResolvedCommentsOptions,
} from "./src/types.js";

export const COMMENTS_PLUGIN_NAME = "comments";

export function comments(options: CommentsOptions = {}) {
  const _resolved = resolveCommentsOptions(options);

  return definePlugin({
    name: COMMENTS_PLUGIN_NAME,
    processedContentCache: {
      version: "comments-v1",
      dependencyMode: "none",
    },
    options,
    validateOptions: validateCommentsOptions,
    assets: [
      createStyleAsset(
        COMMENTS_PLUGIN_NAME,
        "@riebeckite/plugin-comments/style.css",
      ),
    ],
  });
}
