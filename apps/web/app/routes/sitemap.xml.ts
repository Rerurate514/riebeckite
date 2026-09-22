import { createRoute } from "honox/factory";
import { getPublishedEntries } from "../lib/publication";
import {
  buildAbsoluteUrl,
  buildPostUrl,
  getEntryUpdatedTime,
} from "../lib/seo";

export default createRoute(async (c) => {
  const entries = await getPublishedEntries();
  const urls = [
    { loc: buildAbsoluteUrl("/"), lastmod: undefined },
    ...entries
      .filter((entry) => entry.slug !== "index")
      .map((entry) => ({
        loc: buildPostUrl(entry.slug),
        lastmod: getEntryUpdatedTime(entry),
      })),
  ];

  return c.text(renderSitemap(urls), 200, {
    "content-type": "application/xml; charset=utf-8",
  });
});

function renderSitemap(
  urls: { loc: string; lastmod?: string | null }[],
): string {
  const body = urls
    .map((url) => {
      const lastmod = url.lastmod
        ? `<lastmod>${escapeXml(url.lastmod)}</lastmod>`
        : "";
      return `<url><loc>${escapeXml(url.loc)}</loc>${lastmod}</url>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
