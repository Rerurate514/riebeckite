import { isPublished } from "@riebeckite/core";
import type { ArticleBacklink } from "./components/article";
import { config } from "./config";
import { content } from "./content";

export async function getPublishedBacklinks(
  slug: string,
): Promise<ArticleBacklink[]> {
  const backlinks = await content.getBacklinks(slug);
  const results = await Promise.all(
    backlinks.map(async (backlink) => {
      const post = await content.getProcessedContent(backlink.slug);
      if (!isPublished(config, post.frontmatter)) return null;

      return {
        slug: backlink.slug,
        title: getArticleTitle(backlink.slug, post.frontmatter.title),
      };
    }),
  );

  return results.filter(
    (backlink): backlink is ArticleBacklink => backlink !== null,
  );
}

function getArticleTitle(slug: string, title: unknown): string {
  if (typeof title === "string" && title.trim().length > 0) return title;

  return slug.split("/").at(-1) ?? slug;
}
