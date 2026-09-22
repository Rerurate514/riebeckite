import { isPublished } from "@riebeckite/core";
import { createRoute } from "honox/factory";
import { config } from "../config";
import { content } from "../content";
import { getArticleTitle } from "../lib/article-title";

type SearchItem = {
  slug: string;
  title: string;
  content: string;
};

let cachedSearchItems: SearchItem[] | null = null;

export default createRoute(async (c) => {
  const items = await getSearchItems();

  return c.json(items, 200, {
    "Cache-Control": "public, max-age=300",
  });
});

async function getSearchItems(): Promise<SearchItem[]> {
  if (cachedSearchItems) return cachedSearchItems;

  const manifest = await content.getManifest();
  const items = manifest.entries.map((entry) => {
    if (!isPublished(config, entry.frontmatter)) return null;

    return {
      slug: entry.slug,
      title: getArticleTitle(entry.slug, entry.frontmatter.title),
      content: toPlainText(entry.html),
    };
  });

  cachedSearchItems = items
    .filter((item): item is SearchItem => item !== null)
    .sort((a, b) => a.title.localeCompare(b.title, "ja"));

  return cachedSearchItems;
}

function toPlainText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
