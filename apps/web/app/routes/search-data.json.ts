import { isPublished } from "@riebeckite/core";
import { createRoute } from "honox/factory";
import { config } from "../config";
import { content } from "../content";

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

  const posts = await content.getAllPosts();
  const items = await Promise.all(
    posts.map(async (post) => {
      try {
        const article = await content.getProcessedContent(post.slug);
        if (!isPublished(config, article.frontmatter)) return null;

        return {
          slug: post.slug,
          title: getArticleTitle(post.slug, article.frontmatter.title),
          content: toPlainText(article.html),
        };
      } catch (e) {
        console.error(`Failed to index search data for ${post.slug}:`, e);
        return null;
      }
    }),
  );

  cachedSearchItems = items
    .filter((item): item is SearchItem => item !== null)
    .sort((a, b) => a.title.localeCompare(b.title, "ja"));

  return cachedSearchItems;
}

function getArticleTitle(slug: string, title: unknown): string {
  if (typeof title === "string" && title.trim().length > 0) return title;

  return slug.split("/").at(-1) ?? slug;
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
