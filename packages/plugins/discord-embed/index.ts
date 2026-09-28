import { definePlugin } from "@riebeckite/core";
import { buildDiscordHeadTags } from "./src/head.js";
import {
  resolveDiscordEmbedOptions,
  validateDiscordEmbedOptions,
} from "./src/options.js";
import type { DiscordEmbedOptions } from "./src/types.js";

export type {
  DiscordEmbedOptions,
  ResolvedDiscordEmbedOptions,
} from "./src/types.js";
export { buildDiscordHeadTags } from "./src/head.js";
export {
  DEFAULT_THEME_COLOR,
  resolveDiscordEmbedOptions,
} from "./src/options.js";

/**
 * Completes a page's `<head>` for Discord link previews.
 *
 * `Discordbot` reads the shared page's head metadata, so this plugin provides
 * the missing Discord-specific tags on each manifest entry: the embed accent
 * color (`theme-color`) and the OpenGraph image metadata. It does not own the
 * site shell; the Site renders `entry.headTags` (see the HonoX integration
 * docs).
 */
export function discordEmbed(options: DiscordEmbedOptions = {}) {
  const resolved = resolveDiscordEmbedOptions(options);
  return definePlugin({
    name: "discord-embed",
    options,
    validateOptions: validateDiscordEmbedOptions,
    onManifestCreated: ({ manifest, diagnostics }) => {
      for (const entry of manifest.entries) {
        entry.headTags = buildDiscordHeadTags(entry, resolved, diagnostics);
      }
    },
  });
}

export const discordEmbedPlugin = discordEmbed;
