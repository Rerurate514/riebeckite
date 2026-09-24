import { isPublished } from "@riebeckite/core";
import { config } from "../../config";
import { content } from "../../content";
import { getArticleTitle } from "../../lib/article-title";
import type { RecentPost } from "./recent-posts";

export async function getRecentPosts(limit = 5): Promise<RecentPost[]> {
  const posts = await content.getAllPosts();
  const recentPosts = await Promise.all(
    posts
      .filter((post) => post.slug !== "index")
      .map(async (post) => {
        const processed = await content.getProcessedContent(post.slug);
        if (!isPublished(config, processed.frontmatter)) return null;

        const postedAt = parseFrontmatterDate(
          processed.frontmatter.date ?? processed.frontmatter.created,
        );
        if (!postedAt) return null;

        return {
          slug: post.slug,
          title: getArticleTitle(post.slug, processed.frontmatter.title),
          postedAt,
        };
      }),
  );

  return recentPosts
    .filter((post): post is RecentPost => post !== null)
    .toSorted((a, b) => b.postedAt.getTime() - a.postedAt.getTime())
    .slice(0, limit);
}

function parseFrontmatterDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value !== "string") return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}
