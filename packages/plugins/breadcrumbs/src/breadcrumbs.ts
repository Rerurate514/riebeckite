import type {
  ContentManifest,
  ContentManifestEntry,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import type { BreadcrumbItem } from "./types.js";

export type BuildBreadcrumbItemsArgs = {
  manifest: ContentManifest;
  entry: ContentManifestEntry;
  config: ResolvedRiebeckiteConfig;
  homeLabel: string;
};

/**
 * Builds the breadcrumb trail for a note from its slug hierarchy.
 *
 * The first crumb is always the site home (the site title unless the consumer
 * provided a `homeLabel`); each intermediate slug segment becomes a crumb
 * pointing at the folder's own URL. When the folder has an index note of its
 * own, that note's title is used for the crumb instead of the raw segment.
 * The final crumb is the note itself and points at its permalink.
 */
export function buildBreadcrumbItems(
  args: BuildBreadcrumbItemsArgs,
): BreadcrumbItem[] {
  const { manifest, entry, config, homeLabel } = args;
  const segments = entry.slug.split("/").filter(Boolean);
  if (segments.length === 0) return [];

  const items: BreadcrumbItem[] = [];
  const homeName = homeLabel || config.site.title;
  if (homeName) items.push({ name: homeName, url: "/" });

  for (let index = 0; index < segments.length - 1; index++) {
    const folderSlug = segments.slice(0, index + 1).join("/");
    const folderEntry = manifest.bySlug.get(folderSlug);
    items.push({
      name: folderEntry?.title ?? titleCaseSegment(segments[index]),
      url: `/${folderSlug}`,
    });
  }

  items.push({ name: entry.title, url: entry.permalink });
  return items;
}

function titleCaseSegment(segment: string): string {
  return segment.length === 0
    ? segment
    : segment.charAt(0).toUpperCase() + segment.slice(1);
}
