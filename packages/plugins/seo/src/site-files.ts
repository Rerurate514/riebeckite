import type {
  ContentManifestEntry,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { filterFeedEntries, getEntryUpdatedTime } from "./content.js";
import { buildAbsoluteUrl, buildPostUrl } from "./url.js";
import { escapeXml } from "./xml.js";

export function renderSitemap(
  config: ResolvedRiebeckiteConfig,
  entries: ContentManifestEntry[],
): string {
  const urls = [
    { loc: buildAbsoluteUrl(config, "/"), lastmod: undefined },
    ...filterFeedEntries(config, entries, entries.length)
      .filter((entry) => entry.permalink !== "/")
      .map((entry) => ({
        loc: buildPostUrl(config, entry.permalink),
        lastmod: getEntryUpdatedTime(entry),
      })),
  ];
  const body = urls
    .map(
      (url) =>
        `<url><loc>${escapeXml(url.loc)}</loc>${url.lastmod ? `<lastmod>${escapeXml(url.lastmod)}</lastmod>` : ""}</url>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export function renderRobots(config: ResolvedRiebeckiteConfig): string {
  return [
    "User-agent: *",
    "Allow: /",
    `Sitemap: ${buildAbsoluteUrl(config, "/sitemap.xml")}`,
    "",
  ].join("\n");
}
