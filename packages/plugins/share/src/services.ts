import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import type { ResolvedShareOptions, ShareLink, ShareService } from "./types.js";

/** The text pre-filled into a compose-style share intent. */
export type ShareTarget = {
  /** Absolute URL of the note. */
  url: string;
  /** Note title. */
  title: string;
};

/**
 * Resolves a note's `permalink` to an absolute URL against the site base URL.
 * Already-absolute URLs are returned unchanged.
 */
export function buildAbsoluteUrl(
  config: ResolvedRiebeckiteConfig,
  pathOrUrl: string,
): string {
  if (!pathOrUrl) return config.site.baseUrl;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return new URL(
    pathOrUrl,
    config.site.baseUrl || "https://example.com",
  ).toString();
}

/**
 * Normalizes a Mastodon instance to a bare host. Accepts `"mastodon.social"`,
 * `"https://mastodon.social/"`, and `"https://mastodon.social/@user"` (the
 * path is dropped). Returns `""` when nothing usable remains.
 */
export function normalizeMastodonInstance(value: string | undefined): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed === "") return "";

  const withoutScheme = trimmed.replace(/^https?:\/\//i, "");
  const host = withoutScheme.split(/[/?#]/, 1)[0] ?? "";
  return host.replace(/\.+$/, "");
}

/**
 * Builds the share URL for one service. Returns `null` for `"copy"` (which is
 * a button, not a link) and for `"mastodon"` without a usable instance.
 */
export function buildShareUrl(
  service: ShareService,
  target: ShareTarget,
  mastodonInstance = "",
): string | null {
  const url = target.url;
  const title = target.title;
  const composed = title ? `${title} ${url}` : url;

  switch (service) {
    case "x":
      return `https://twitter.com/intent/tweet?url=${encode(url)}&text=${encode(title)}`;
    case "bluesky":
      return `https://bsky.app/intent/compose?text=${encode(composed)}`;
    case "mastodon": {
      const instance = normalizeMastodonInstance(mastodonInstance);
      if (instance === "") return null;
      return `https://${instance}/share?text=${encode(composed)}`;
    }
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encode(url)}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encode(url)}`;
    case "hatena":
      return `https://b.hatena.ne.jp/add?mode=confirm&url=${encode(url)}&title=${encode(title)}`;
    case "copy":
      return null;
  }
}

/**
 * Builds every link-bearing service in the configured order, resolving labels
 * and skipping services whose URL cannot be built (for example `mastodon`
 * without an instance). The `copy` service is intentionally excluded.
 */
export function buildShareLinks(
  options: ResolvedShareOptions,
  target: ShareTarget,
): ShareLink[] {
  const links: ShareLink[] = [];
  for (const service of options.services) {
    const url = buildShareUrl(service, target, options.mastodonInstance);
    if (url === null) continue;
    links.push({ service, label: options.labels[service], url });
  }
  return links;
}

function encode(value: string): string {
  return encodeURIComponent(value);
}
