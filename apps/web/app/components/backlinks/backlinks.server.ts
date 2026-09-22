import { isPublished } from "@riebeckite/core";
import { config } from "../../config";
import { content } from "../../content";
import { getArticleTitle } from "../../lib/article-title";
import type { ArticleBacklink } from "./backlinks";

export async function getPublishedBacklinks(
  slug: string,
): Promise<ArticleBacklink[]> {
  const manifest = await content.getManifest();
  const backlinkSlugs = manifest.incomingLinks.get(slug) ?? [];
  const results = backlinkSlugs.map((backlinkSlug) => {
    const entry = manifest.bySlug.get(backlinkSlug);
    if (!entry || !isPublished(config, entry.frontmatter)) return null;

    return {
      slug: entry.slug,
      title: getArticleTitle(entry.slug, entry.frontmatter.title),
    };
  });

  return results.filter(
    (backlink): backlink is ArticleBacklink => backlink !== null,
  );
}
