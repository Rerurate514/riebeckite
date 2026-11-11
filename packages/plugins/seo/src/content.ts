import type {
  ContentManifestEntry,
  PostContent,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { resolveEntryDate, stripHtml, toIsoDate } from "@riebeckite/core";

export function getDescription(
  post: Pick<PostContent, "frontmatter" | "html">,
): string {
  const frontmatterDescription = post.frontmatter.description;
  if (
    typeof frontmatterDescription === "string" &&
    frontmatterDescription.trim()
  ) {
    return frontmatterDescription.trim();
  }

  return stripHtml(post.html).replace(/\s+/g, " ").trim().slice(0, 160);
}

export function filterFeedEntries(
  _config: ResolvedRiebeckiteConfig,
  entries: ContentManifestEntry[],
  limit = 30,
): ContentManifestEntry[] {
  return entries
    .filter((entry) => entry.frontmatter.noindex !== true)
    .sort((a, b) => getSortableTime(b) - getSortableTime(a))
    .slice(0, Math.max(0, Math.floor(limit)));
}

export function getEntryPublishedTime(
  entry: ContentManifestEntry,
): string | null {
  return resolveEntryDate(entry.frontmatter);
}

export function getEntryUpdatedTime(
  entry: ContentManifestEntry,
): string | null {
  return toIsoDate(entry.frontmatter.updated) ?? getEntryPublishedTime(entry);
}

export function getHtmlLanguage(config: ResolvedRiebeckiteConfig): string {
  return config.site.locale.replace("_", "-");
}

export function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.filter(
    (tag): tag is string => typeof tag === "string" && tag.trim().length > 0,
  );
}

function getSortableTime(entry: ContentManifestEntry): number {
  for (const value of [
    entry.frontmatter.updated,
    entry.frontmatter.published,
    entry.frontmatter.date,
    entry.frontmatter.created,
  ]) {
    const date = toIsoDate(value);
    if (date !== null) return Date.parse(date);
  }
  return 0;
}
