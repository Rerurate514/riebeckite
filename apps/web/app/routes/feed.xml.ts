import { createRoute } from "honox/factory";
import { config } from "../config";
import { getPublishedEntries } from "../lib/publication";
import {
  buildAbsoluteUrl,
  buildPostUrl,
  getDescription,
  getEntryPublishedTime,
} from "../lib/seo";

export default createRoute(async (c) => {
  const entries = await getPublishedEntries();
  const items = entries.map((entry) => {
    const url = buildPostUrl(entry.slug);
    const pubDate = getEntryPublishedTime(entry);
    return `<item><title>${escapeXml(entry.title)}</title><link>${escapeXml(url)}</link><guid>${escapeXml(url)}</guid><description>${escapeXml(getDescription(entry))}</description>${pubDate ? `<pubDate>${new Date(pubDate).toUTCString()}</pubDate>` : ""}</item>`;
  });

  return c.body(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(config.site.feed.title)}</title><link>${escapeXml(buildAbsoluteUrl("/"))}</link><description>${escapeXml(config.site.feed.description)}</description><language>${escapeXml(config.site.feed.language)}</language>${items.join("")}</channel></rss>`,
    200,
    { "content-type": "application/rss+xml; charset=utf-8" },
  );
});

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
