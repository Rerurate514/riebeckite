import { type ContentManifestEntry, isPublished } from "@riebeckite/core";
import { config } from "../config";
import { content } from "../content";

export async function getPublishedEntries(): Promise<ContentManifestEntry[]> {
  const manifest = await content.getManifest();
  return manifest.entries
    .filter(
      (entry) =>
        isPublished(config, entry.frontmatter) &&
        entry.frontmatter.noindex !== true,
    )
    .sort((a, b) => getSortableTime(b) - getSortableTime(a));
}

function getSortableTime(entry: ContentManifestEntry): number {
  const value =
    entry.frontmatter.updated ??
    entry.frontmatter.published ??
    entry.frontmatter.date ??
    entry.frontmatter.created;
  if (value instanceof Date) return value.getTime();
  if (typeof value !== "string") return 0;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}
