import type {
  ContentManifest,
  ContentManifestEntry,
  FolderLocationResolution,
  PluginDataHelper,
  PublicContentEntry,
  PublicContentView,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { resolvePublicFolderLocation } from "@riebeckite/core";
import type { BreadcrumbItem } from "./types.js";

export type PublicLocationIndex = {
  readonly entries: ReadonlyMap<string, ContentManifestEntry>;
  readonly folders: ReadonlyMap<string, FolderLocationResolution>;
};

type BuildBreadcrumbItemsArgs = {
  manifest: ContentManifest;
  entry: {
    slug: string;
    title: string;
    publicLocation: { permalink: string };
  };
  config: ResolvedRiebeckiteConfig;
  homeLabel: string;
  locations?: PublicLocationIndex;
};

export function createPublicLocationIndex(
  manifest: ContentManifest,
): PublicLocationIndex {
  const entries = new Map<string, ContentManifestEntry>();
  for (const entry of manifest.publicEntries) {
    const pathname = normalizePathname(entry.publicLocation.permalink);
    if (!entries.has(pathname)) entries.set(pathname, entry);
  }

  const folders = new Map<string, FolderLocationResolution>();
  for (const location of manifest.folderLocations.values()) {
    const pathname = normalizePathname(location.pathname);
    if (!folders.has(pathname)) {
      folders.set(pathname, { type: "generated", pathname: location.pathname });
    }
  }

  return { entries, folders };
}

export function resolveIndexedPublicFolderLocation(
  locations: PublicLocationIndex,
  pathname: string,
): FolderLocationResolution {
  const normalizedPathname = normalizePathname(pathname);
  const entry = locations.entries.get(normalizedPathname);
  if (entry) return { type: "content", entry };
  return locations.folders.get(normalizedPathname) ?? { type: "none" };
}

export function buildBreadcrumbItems(
  args: BuildBreadcrumbItemsArgs,
): BreadcrumbItem[] {
  const { manifest, entry, config, homeLabel, locations } = args;
  if (!entry.slug) return [];
  const segments = publicPathSegments(entry.publicLocation.permalink);

  const items: BreadcrumbItem[] = [];
  const homeName = homeLabel || config.site.title;
  if (homeName) pushBreadcrumbItem(items, { name: homeName, url: "/" });

  if (segments.length === 0) return items;

  for (let index = 0; index < segments.length - 1; index++) {
    const pathname = `/${segments.slice(0, index + 1).join("/")}`;
    const location = locations
      ? resolveIndexedPublicFolderLocation(locations, pathname)
      : resolvePublicFolderLocation(manifest, pathname);
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

export const getBreadcrumbs: PluginDataHelper<
  {
    view: PublicContentView;
    entry: PublicContentEntry;
    homeLabel?: string;
  },
  readonly BreadcrumbItem[]
> = ({ view, entry, homeLabel = "" }) => {
  if (!view.findRoutableBySlug(entry.slug)) return [];
  const segments = publicPathSegments(entry.permalink);
  const items: BreadcrumbItem[] = [];
  if (homeLabel) pushBreadcrumbItem(items, { name: homeLabel, url: "/" });

  const entriesByPermalink = discoverableEntryIndex(view);
  for (let index = 0; index < segments.length - 1; index += 1) {
    const pathname = `/${segments.slice(0, index + 1).join("/")}`;
    const target = entriesByPermalink.get(pathname);
    pushBreadcrumbItem(items, {
      name: target?.title || titleCaseSegment(segments[index]),
      ...(target ? { url: target.permalink } : {}),
    });
  }

  pushBreadcrumbItem(items, { name: entry.title, url: entry.permalink });
  return items;
};

const discoverableIndexes = new WeakMap<
  PublicContentView,
  ReadonlyMap<string, PublicContentEntry>
>();

function discoverableEntryIndex(
  view: PublicContentView,
): ReadonlyMap<string, PublicContentEntry> {
  const cached = discoverableIndexes.get(view);
  if (cached) return cached;

  const index = new Map<string, PublicContentEntry>();
  for (const entry of view.discoverableEntries) {
    const pathname = normalizePathname(entry.permalink);
    if (!index.has(pathname)) index.set(pathname, entry);
  }
  discoverableIndexes.set(view, index);
  return index;
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

function normalizePathname(pathname: string): string {
  const segments = publicPathSegments(pathname);
  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

function titleCaseSegment(segment: string): string {
  return segment.length === 0
    ? segment
    : segment.charAt(0).toUpperCase() + segment.slice(1);
}
