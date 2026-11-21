import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import {
  resolveCommentsPublicConfig,
  validateCommentsOptions,
} from "./src/options.js";
import type { CommentsOptions } from "./src/types.js";

export type {
  ArticleCommentsSectionProps,
  CommentsSectionProps,
} from "./components/comments-section.js";
export {
  ArticleCommentsSection,
  default as CommentsSection,
} from "./components/comments-section.js";
export { initComments } from "./src/init.js";
export {
  DEFAULT_COMMENTS_CLASS_NAME,
  DEFAULT_GISCUS_LANG,
  DEFAULT_GISCUS_MAPPING,
  DEFAULT_GISCUS_THEME,
  GISCUS_INPUT_POSITIONS,
  GISCUS_MAPPINGS,
  resolveCommentsOptions,
  resolveCommentsPublicConfig,
  validateCommentsOptions,
} from "./src/options.js";
export {
  COMMENTS_ATTRIBUTE,
  COMMENTS_ROOT_CLASS,
  GISCUS_CONTAINER_CLASS,
  GISCUS_SCRIPT_URL,
} from "./src/render.js";
export type {
  CommentsOptions,
  CommentsPublicConfig,
  GiscusInputPosition,
  GiscusMapping,
  ResolvedCommentsOptions,
} from "./src/types.js";

export const COMMENTS_PLUGIN_NAME = "comments";

/**
 * Registers the comments plugin, embedding a Giscus thread into every page that
 * places `ArticleCommentsSection`.
 */
export function comments(options: CommentsOptions) {
  return definePlugin({
    name: COMMENTS_PLUGIN_NAME,
    options,
    validateOptions: validateCommentsOptions,
    assets: [
      createStyleAsset(
        COMMENTS_PLUGIN_NAME,
        "@riebeckite/plugin-comments/style.css",
      ),
    ],
    clientEntries: [
      createClientEntry(COMMENTS_PLUGIN_NAME, {
        moduleSpecifier: "@riebeckite/plugin-comments/client",
        exportName: "initComments",
        presenceSelector: "[data-rr-comments]",
        publicConfig: resolveCommentsPublicConfig(options),
      }),
    ],
  });
}
