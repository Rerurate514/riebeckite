import { createRoute } from "honox/factory";
import { config } from "../config";
import { getPublishedEntries } from "../lib/publication";
import {
  buildAbsoluteUrl,
  buildPostUrl,
  getDescription,
  getEntryUpdatedTime,
} from "../lib/seo";

export default createRoute(async (c) => {
  const entries = await getPublishedEntries();
  const updated =
    entries.map(getEntryUpdatedTime).find(Boolean) ?? new Date(0).toISOString();
  const items = entries.map((entry) => {
    const url = buildPostUrl(entry.slug);
    return `<entry><title>${escapeXml(entry.title)}</title><link href="${escapeXml(url)}"/><id>${escapeXml(url)}</id><updated>${escapeXml(getEntryUpdatedTime(entry) ?? updated)}</updated><summary>${escapeXml(getDescription(entry))}</summary></entry>`;
  });

  return c.body(
    `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>${escapeXml(config.site.feed.title)}</title><link href="${escapeXml(buildAbsoluteUrl("/"))}"/><link rel="self" href="${escapeXml(buildAbsoluteUrl("/atom.xml"))}"/><id>${escapeXml(buildAbsoluteUrl("/"))}</id><updated>${escapeXml(updated)}</updated>${items.join("")}</feed>`,
    200,
    { "content-type": "application/atom+xml; charset=utf-8" },
  );
});

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
