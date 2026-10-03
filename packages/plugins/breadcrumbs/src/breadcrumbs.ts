import type {
  ContentManifest,
  ContentManifestEntry,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { resolveFolderLocation } from "@riebeckite/core";
import type { BreadcrumbItem } from "./types.js";

export type BuildBreadcrumbItemsArgs = {
  manifest: ContentManifest;
  entry: ContentManifestEntry;
  config: ResolvedRiebeckiteConfig;
  homeLabel: string;
};

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
    const location = resolveFolderLocation(manifest, folderSlug);
    items.push({
      name:
        location.type === "content"
          ? location.entry.title
          : titleCaseSegment(segments[index]),
      ...(location.type === "content"
        ? { url: location.entry.publicLocation.permalink }
        : location.type === "generated"
          ? { url: location.pathname }
          : {}),
    });
  }

  items.push({ name: entry.title, url: entry.publicLocation.permalink });
  return items;
}

function titleCaseSegment(segment: string): string {
  return segment.length === 0
    ? segment
    : segment.charAt(0).toUpperCase() + segment.slice(1);
}
