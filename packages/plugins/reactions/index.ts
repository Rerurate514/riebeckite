import { createStyleAsset, definePlugin } from "@riebeckite/core";
import {
  resolveReactionsOptions,
  validateReactionsOptions,
} from "./src/options.js";
import { renderReactions } from "./src/render.js";
import type { ReactionsOptions } from "./src/types.js";

export type { ReactionsProps } from "./components/reactions.js";
export { default as Reactions } from "./components/reactions.js";
export {
  DEFAULT_REACTIONS_ARIA_LABEL,
  DEFAULT_REACTIONS_CLASS_NAME,
  resolveReactionsOptions,
  validateReactionsOptions,
} from "./src/options.js";
export type {
  ReactionsCapability,
  ReactionsProvider,
} from "./src/provider.js";
export { MemoryReactionsProvider } from "./src/provider.js";
export {
  REACTIONS_ATTRIBUTE,
  REACTIONS_ROOT_CLASS,
  renderReactions,
} from "./src/render.js";
export {
  DEFAULT_REACTIONS,
  type PageReactions,
  REACTION_TYPES,
  type ReactionCount,
  type ReactionEmoji,
  type ReactionsOptions,
  type ReactionType,
  type ResolvedReactionsOptions,
} from "./src/types.js";

export const REACTIONS_PLUGIN_NAME = "reactions";

export function reactions(options: ReactionsOptions = {}) {
  const resolved = resolveReactionsOptions(options);

  return definePlugin({
    name: REACTIONS_PLUGIN_NAME,
    processedContentCache: {
      version: "reactions-v2",
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
    onManifestCreated: async ({ manifest }) => {
      for (const entry of manifest.entries) {
        if (!entry.contentId) continue;
        const data = await resolved.provider.getReactions(entry.contentId);
        const html = renderReactions(
          resolved.reactions,
          data,
          resolved.className,
          resolved.ariaLabel,
        );
        entry.html = `${entry.html}\n${html}`;
      }
    },
  });
}
