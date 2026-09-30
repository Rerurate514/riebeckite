import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import {
  getDescription,
  getEntryPublishedTime,
  getEntryUpdatedTime,
  getHtmlLanguage,
  normalizeTags,
} from "./content.js";
import { removeUndefined } from "./schema.js";
import type { RenderableFeedEntry } from "./types.js";
import { buildAbsoluteUrl, buildPostUrl } from "./url.js";
import { escapeXml } from "./xml.js";

export function renderRssFeed(
  config: ResolvedRiebeckiteConfig,
  entries: RenderableFeedEntry[],
): string {
  const feed = getResolvedFeedMetadata(config);
  const items = entries.map((entry) => {
    const url = buildPostUrl(config, entry.permalink);
    const pubDate = getEntryPublishedTime(entry);
    return `<item><title>${escapeXml(entry.title)}</title><link>${escapeXml(url)}</link><guid>${escapeXml(url)}</guid><description>${escapeXml(getDescription(entry))}</description>${pubDate ? `<pubDate>${new Date(pubDate).toUTCString()}</pubDate>` : ""}</item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(feed.title)}</title><link>${escapeXml(buildAbsoluteUrl(config, "/"))}</link><description>${escapeXml(feed.description)}</description><language>${escapeXml(feed.language)}</language>${items.join("")}</channel></rss>`;
}

export function renderAtomFeed(
  config: ResolvedRiebeckiteConfig,
  entries: RenderableFeedEntry[],
): string {
  const feed = getResolvedFeedMetadata(config);
  const updated =
    entries.map(getEntryUpdatedTime).find(Boolean) ?? new Date(0).toISOString();
  const items = entries.map((entry) => {
    const url = buildPostUrl(config, entry.permalink);
    return `<entry><title>${escapeXml(entry.title)}</title><link href="${escapeXml(url)}"/><id>${escapeXml(url)}</id><updated>${escapeXml(getEntryUpdatedTime(entry) ?? updated)}</updated><summary>${escapeXml(getDescription(entry))}</summary></entry>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>${escapeXml(feed.title)}</title><link href="${escapeXml(buildAbsoluteUrl(config, "/"))}"/><link rel="self" href="${escapeXml(buildAbsoluteUrl(config, "/atom.xml"))}"/><id>${escapeXml(buildAbsoluteUrl(config, "/"))}</id><updated>${escapeXml(updated)}</updated>${items.join("")}</feed>`;
}

export function renderJsonFeed(
  config: ResolvedRiebeckiteConfig,
  entries: RenderableFeedEntry[],
): string {
  const feed = getResolvedFeedMetadata(config);
  return JSON.stringify({
    version: "https://jsonfeed.org/version/1.1",
    title: feed.title,
    home_page_url: buildAbsoluteUrl(config, "/"),
    feed_url: buildAbsoluteUrl(config, "/feed.json"),
    description: feed.description,
    language: feed.language,
    items: entries.map((entry) => {
      const url = buildPostUrl(config, entry.permalink);
      return removeUndefined({
        id: url,
        url,
        title: entry.title,
        content_html: entry.html,
        summary: getDescription(entry),
        date_published: getEntryPublishedTime(entry) ?? undefined,
        date_modified: getEntryUpdatedTime(entry) ?? undefined,
        tags: normalizeTags(entry.frontmatter.tags),
      });
    }),
  });
}

function getResolvedFeedMetadata(config: ResolvedRiebeckiteConfig): {
  title: string;
  description: string;
  language: string;
} {
  return {
    title: config.site.feed.title ?? config.site.title,
    description: config.site.feed.description ?? config.site.description,
    language: config.site.feed.language ?? getHtmlLanguage(config),
  };
}
