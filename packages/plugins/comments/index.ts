import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { validateCommentsOptions } from "./src/options.js";
import type { CommentsOptions } from "./src/types.js";

export type {
  ArticleCommentsSectionProps,
  CommentsSectionProps,
} from "./components/comments-section.js";
export {
  ArticleCommentsSection,
  default as CommentsSection,
} from "./components/comments-section.js";
export { initGiscusComments } from "./src/giscus/client.js";
export {
  DEFAULT_GISCUS_LANG,
  DEFAULT_GISCUS_MAPPING,
  DEFAULT_GISCUS_THEME,
  GISCUS_INPUT_POSITIONS,
  GISCUS_MAPPINGS,
  resolveGiscusOptions,
  resolveGiscusPublicConfig,
  validateGiscusOptions,
} from "./src/giscus/options.js";
export {
  GISCUS_PROVIDER_NAME,
  giscus,
} from "./src/giscus/provider.js";
export {
  DEFAULT_COMMENTS_CLASS_NAME,
  resolveCommentsOptions,
  validateCommentsOptions,
} from "./src/options.js";
export {
  COMMENTS_ATTRIBUTE,
  COMMENTS_MOUNTED_ATTRIBUTE,
  COMMENTS_ROOT_CLASS,
  COMMENTS_THREAD_ATTRIBUTE,
  COMMENTS_THREAD_CLASS,
  GISCUS_SCRIPT_URL,
} from "./src/render.js";
export type {
  CommentsClientEntry,
  CommentsInitializer,
  CommentsOptions,
  CommentsProvider,
  GiscusInputPosition,
  GiscusMapping,
  GiscusOptions,
  GiscusPublicConfig,
  ResolvedCommentsOptions,
  ResolvedGiscusOptions,
} from "./src/types.js";

export const COMMENTS_PLUGIN_NAME = "comments";

/**
 * Registers the comments plugin. The provider decides what is embedded and
 * which browser module mounts it into `ArticleCommentsSection`.
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
        moduleSpecifier: options.provider.client.moduleSpecifier,
        exportName: options.provider.client.exportName,
        presenceSelector: "[data-rr-comments]",
        publicConfig: options.provider.publicConfig,
      }),
    ],
  });
}
