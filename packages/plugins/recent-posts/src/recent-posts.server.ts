import { isPublished, type ResolvedRiebeckiteConfig } from "@riebeckite/core";
import type { RecentPost } from "./recent-posts";

type PostRef = { slug: string };
type ProcessedPost = { frontmatter: Record<string, unknown> };
type TitleResolver = (slug: string, title: unknown) => string;

export async function getRecentPosts(args: {
  posts: PostRef[];
  config: ResolvedRiebeckiteConfig;
  getProcessedContent: (slug: string) => Promise<ProcessedPost>;
  resolveTitle: TitleResolver;
  limit?: number;
}): Promise<RecentPost[]> {
  const limit = args.limit ?? 5;
  const recentPosts = await Promise.all(
    args.posts
      .filter((post) => post.slug !== "index")
      .map(async (post) => {
        const processed = await args.getProcessedContent(post.slug);
        if (!isPublished(args.config, processed.frontmatter)) return null;

        const postedAt = parseFrontmatterDate(
          processed.frontmatter.date ?? processed.frontmatter.created,
        );
        if (!postedAt) return null;

        return {
          slug: post.slug,
          title: args.resolveTitle(post.slug, processed.frontmatter.title),
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
