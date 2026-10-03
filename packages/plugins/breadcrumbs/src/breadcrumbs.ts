import type {
  ContentManifest,
  ContentManifestEntry,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { resolvePublicFolderLocation } from "@riebeckite/core";
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
  if (!entry.slug) return [];
  const segments = publicPathSegments(entry.publicLocation.permalink);

  const items: BreadcrumbItem[] = [];
  const homeName = homeLabel || config.site.title;
  if (homeName) pushBreadcrumbItem(items, { name: homeName, url: "/" });

  if (segments.length === 0) return items;

  for (let index = 0; index < segments.length - 1; index++) {
    const pathname = `/${segments.slice(0, index + 1).join("/")}`;
    const location = resolvePublicFolderLocation(manifest, pathname);
    pushBreadcrumbItem(items, {
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

  pushBreadcrumbItem(items, {
    name: entry.title,
    url: entry.publicLocation.permalink,
  });
  return items;
}

function pushBreadcrumbItem(items: BreadcrumbItem[], item: BreadcrumbItem) {
  const previous = items.at(-1);
  if (previous?.name === item.name) {
    items[items.length - 1] = item;
    return;
  }
  items.push(item);
}

function publicPathSegments(permalink: string): string[] {
  return permalink.split("/").filter(Boolean);
}

function titleCaseSegment(segment: string): string {
  return segment.length === 0
    ? segment
    : segment.charAt(0).toUpperCase() + segment.slice(1);
}
