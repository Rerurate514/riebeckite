import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { resolveShareOptions, validateShareOptions } from "./src/options.js";
import type { ShareOptions } from "./src/types.js";

export type { ShareControlsProps } from "./components/share-controls.js";
export { default as ShareControls } from "./components/share-controls.js";

export { initShare } from "./src/client.js";
export {
  getShareLinks,
  type ShareLinksData,
} from "./src/data.js";
export {
  DEFAULT_SHARE_ARIA_LABEL,
  DEFAULT_SHARE_COPIED_LABEL,
  DEFAULT_SHARE_COPY_FAILED_LABEL,
  DEFAULT_SHARE_LABELS,
  DEFAULT_SHARE_SERVICES,
  resolveShareOptions,
  validateShareOptions,
} from "./src/options.js";
export {
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
  ShareService,
} from "./src/types.js";
export { SHARE_SERVICES } from "./src/types.js";

export const SHARE_PLUGIN_NAME = "share";

/**
 * Per-article share controls.
 *
 * For every entry the plugin builds absolute share URLs for the configured
 * services and exposes the controls for the Site to render. The links
 * are ordinary anchors, so they work without
 * JavaScript; only the copy-link action is enhanced at runtime.
 */
export function share(options: ShareOptions = {}) {
  const _resolved = resolveShareOptions(options);

  return definePlugin({
    name: SHARE_PLUGIN_NAME,
    processedContentCache: {
      version: "share-v1",
      dependencyMode: "none",
    },
    options,
    validateOptions: validateShareOptions,
    assets: [
      createStyleAsset(SHARE_PLUGIN_NAME, "@riebeckite/plugin-share/style.css"),
    ],
    clientEntries: [
      createClientEntry(
        SHARE_PLUGIN_NAME,
        "@riebeckite/plugin-share/client",
        "initShare",
      ),
    ],
  });
}

/** Alias matching the `*Plugin` suffix used by other plugin factories. */
export const sharePlugin = share;
