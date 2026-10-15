import {
  appendContentBodySlot,
  createClientEntry,
  createStyleAsset,
  definePlugin,
  type PluginDataHelper,
  type PublicContentEntry,
  type ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { resolveShareOptions, validateShareOptions } from "./src/options.js";
import { renderShareControls } from "./src/render.js";
import { buildAbsoluteUrl, buildShareLinks } from "./src/services.js";
import type { ShareOptions } from "./src/types.js";

export type { ShareControlsProps } from "./components/share-controls.js";
export { default as ShareControls } from "./components/share-controls.js";

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

export type ShareLinksData = {
  readonly links: readonly import("./src/types.js").ShareLink[];
  readonly copyUrl?: string;
  readonly ariaLabel: string;
  readonly className: string;
  readonly copyLabel: string;
};

export const getShareLinks: PluginDataHelper<
  {
    entry: PublicContentEntry;
    site: Pick<ResolvedRiebeckiteConfig, "site">;
    options?: ShareOptions;
  },
  ShareLinksData
> = ({ entry, site, options }) => {
  const resolved = resolveShareOptions(options);
  const url = buildAbsoluteUrl(site, entry.permalink);
  return {
    links: buildShareLinks(resolved, { url, title: entry.title }),
    ...(resolved.services.includes("copy") ? { copyUrl: url } : {}),
    ariaLabel: resolved.ariaLabel,
    className: resolved.className,
    copyLabel: resolved.labels.copy,
  };
};

export const SHARE_PLUGIN_NAME = "share";

/**
 * Per-article share controls.
 *
 * For every entry the plugin builds absolute share URLs for the configured
 * services and contributes the controls to an article layout slot. The links
 * are ordinary anchors, so they work without
 * JavaScript; only the copy-link action is enhanced at runtime.
 */
export function share(options: ShareOptions = {}) {
  const resolved = resolveShareOptions(options);

  return definePlugin({
    name: SHARE_PLUGIN_NAME,
    processedContentCache: {
      version: "share-v1",
      dependencyMode: "none",
    },
    options,
    validateOptions: validateShareOptions,
    onManifestCreated: (context) => {
      const { manifest, config } = context;
      if (!config) return;

      for (const entry of manifest.entries) {
        const block = renderShareControls(resolved, {
          url: buildAbsoluteUrl(config, entry.permalink),
          title: entry.title,
        });
        if (block === "") continue;

        const slot =
          resolved.placement === "top"
            ? "article.before-content"
            : "article.footer";
        if (!hasSlotFragment(entry.bodySlots?.[slot], block)) {
          appendContentBodySlot(entry, slot, block);
        }
      }
    },
    assets: [createStyleAsset(SHARE_PLUGIN_NAME)],
    clientEntries: [createClientEntry(SHARE_PLUGIN_NAME, "initShare")],
  });
}

/** Alias matching the `*Plugin` suffix used by other plugin factories. */
export const sharePlugin = share;

function hasSlotFragment(slot: string | undefined, fragment: string): boolean {
  return (
    slot === fragment ||
    slot?.startsWith(`${fragment}\n`) ||
    slot?.endsWith(`\n${fragment}`) ||
    slot?.includes(`\n${fragment}\n`) ||
    false
  );
}
