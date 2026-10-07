import type { ContentManifest } from "@riebeckite/core";
import type { RecentPost } from "./recent-posts.js";

export const DEFAULT_RECENT_POSTS_LIMIT = 5;

/**
 * Builds the recent-posts list from the manifest.
 *
 * Reads `manifest.discoverableEntries` on purpose: discovery UI must never
 * surface `unlisted`, `draft`, or future-`publishAt` notes that are not
 * discoverable, even though some of them are routable. The plugin owns the
 * entry selection, the frontmatter date extraction, the sort, and the default
 * title so a Site only decides whether and where to render the list.
 */
export function getRecentPosts(args: {
  manifest: Pick<ContentManifest, "discoverableEntries">;
  limit?: number;
}): RecentPost[] {
  const limit = Math.max(0, args.limit ?? DEFAULT_RECENT_POSTS_LIMIT);
  return args.manifest.discoverableEntries
    .filter((entry) => entry.slug !== "index")
    .flatMap((entry) => {
      const postedAt = parseFrontmatterDate(
        entry.frontmatter.date ?? entry.frontmatter.created,
      );
      if (!postedAt) return [];

      return [
        {
          slug: entry.slug,
          permalink: entry.permalink,
          title: entry.title,
          postedAt,
        },
      ];
    })
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
