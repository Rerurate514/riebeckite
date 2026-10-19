import type {
  PluginDataHelper,
  PublicContentEntry,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { resolveShareOptions } from "./options.js";
import { SHARE_ROOT_CLASS } from "./render.js";
import { buildAbsoluteUrl, buildShareLinks } from "./services.js";
import type { ShareLink, ShareOptions } from "./types.js";

export type ShareLinksData = {
  readonly links: readonly ShareLink[];
  readonly copyUrl?: string;
  readonly ariaLabel: string;
  readonly className: string;
  readonly copyLabel: string;
  readonly copiedLabel: string;
  readonly copyFailedLabel: string;
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
    className: resolved.className || SHARE_ROOT_CLASS,
    copyLabel: resolved.labels.copy,
    copiedLabel: resolved.copiedLabel,
    copyFailedLabel: resolved.copyFailedLabel,
  };
};
