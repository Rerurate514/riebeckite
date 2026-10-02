import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
  type PostContent,
} from "@riebeckite/core";
import { resolveShareOptions, validateShareOptions } from "./src/options.js";
import {
  injectShareControls,
  renderShareControls,
  SHARE_ATTRIBUTE,
} from "./src/render.js";
import { buildAbsoluteUrl } from "./src/services.js";
import type { ShareOptions } from "./src/types.js";

export { initShare } from "./src/client.js";
export {
  DEFAULT_SHARE_ARIA_LABEL,
  DEFAULT_SHARE_COPIED_LABEL,
  DEFAULT_SHARE_COPY_FAILED_LABEL,
  DEFAULT_SHARE_LABELS,
  DEFAULT_SHARE_PLACEMENT,
  DEFAULT_SHARE_SERVICES,
  resolveShareOptions,
  validateShareOptions,
} from "./src/options.js";
export {
  injectShareControls,
  renderShareControls,
  SHARE_ATTRIBUTE,
  SHARE_ROOT_CLASS,
} from "./src/render.js";
export {
  buildAbsoluteUrl,
  buildShareLinks,
  buildShareUrl,
  normalizeMastodonInstance,
  type ShareTarget,
} from "./src/services.js";
export type {
  ResolvedShareOptions,
  ShareLink,
  ShareOptions,
  SharePlacement,
  ShareService,
} from "./src/types.js";
export { SHARE_SERVICES } from "./src/types.js";

export const SHARE_PLUGIN_NAME = "share";

/**
 * Per-article share controls.
 *
 * For every entry the plugin builds absolute share URLs for the configured
 * services and injects the controls into both `entry.html` and the cached
 * `PostContent.html` that the content route renders. The links are ordinary
 * anchors, so they work without JavaScript; only the copy-link action is
 * enhanced at runtime.
 */
export function share(options: ShareOptions = {}) {
  const resolved = resolveShareOptions(options);
  const processed = new Map<string, PostContent>();

  return definePlugin({
    name: SHARE_PLUGIN_NAME,
    processedContentCache: {
      version: "share-v1",
      dependencyMode: "unsafe",
    },
    options,
    validateOptions: validateShareOptions,
    onPostProcessed: (context) => {
      processed.set(context.slug, context.content);
    },
    onManifestCreated: (context) => {
      const { manifest, config } = context;
      if (!config) return;

      for (const entry of manifest.entries) {
        if (!entry.html || entry.html.includes(SHARE_ATTRIBUTE)) continue;

        const block = renderShareControls(resolved, {
          url: buildAbsoluteUrl(config, entry.permalink),
          title: entry.title,
        });
        if (block === "") continue;

        const html = injectShareControls(entry.html, block, resolved.placement);
        entry.html = html;

        const content = processed.get(entry.slug);
        if (content) content.html = html;
      }
      processed.clear();
    },
    assets: [createStyleAsset(SHARE_PLUGIN_NAME)],
    clientEntries: [createClientEntry(SHARE_PLUGIN_NAME, "initShare")],
  });
}

/** Alias matching the `*Plugin` suffix used by other plugin factories. */
export const sharePlugin = share;
