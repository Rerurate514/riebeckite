import { isPublished } from "@riebeckite/core";
import { config } from "../../config";
import { content } from "../../content";
import { getArticleTitle } from "../../lib/article-title";
import type { ArticleBacklink } from "./backlinks";

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
