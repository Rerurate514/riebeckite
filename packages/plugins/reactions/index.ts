import {
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import {
  resolveReactionsOptions,
  validateReactionsOptions,
} from "./src/options.js";
import type { ReactionsOptions } from "./src/types.js";

export type { ReactionsProps } from "./components/reactions.js";
export { default as Reactions } from "./components/reactions.js";
export {
  DEFAULT_REACTIONS_ARIA_LABEL,
  DEFAULT_REACTIONS_CLASS_NAME,
  resolveReactionsOptions,
  validateReactionsOptions,
} from "./src/options.js";
export { MemoryReactionsProvider } from "./src/provider.js";
export type {
  ReactionsCapability,
  ReactionsProvider,
} from "./src/provider.js";
export { REACTIONS_ATTRIBUTE, REACTIONS_ROOT_CLASS, renderReactions } from "./src/render.js";
export {
  DEFAULT_REACTIONS,
  REACTION_TYPES,
  type PageReactions,
  type ReactionCount,
  type ReactionEmoji,
  type ReactionsOptions,
  type ReactionType,
  type ResolvedReactionsOptions,
} from "./src/types.js";

export const REACTIONS_PLUGIN_NAME = "reactions";

export function reactions(options: ReactionsOptions = {}) {
  const _resolved = resolveReactionsOptions(options);

  return definePlugin({
    name: REACTIONS_PLUGIN_NAME,
    processedContentCache: {
      version: "reactions-v1",
      dependencyMode: "none",
    },
    options,
    validateOptions: validateReactionsOptions,
    assets: [
      createStyleAsset(
        REACTIONS_PLUGIN_NAME,
        "@riebeckite/plugin-reactions/style.css",
      ),
    ],
  });
}
