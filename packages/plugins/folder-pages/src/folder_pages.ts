import type {
  ContentManifest,
  ContentManifestEntry,
  ContentPublicLocation,
  OutputDependency,
} from "@riebeckite/core";
import { resolveGeneratedFolderLocation } from "@riebeckite/core";
import type { FolderPage, FolderPageLink, FolderPagesModel } from "./types.js";

const ENTRY_BASENAMES = ["README", "index"] as const;

export function collapseFolderEntryLocations(
  locations: Map<string, ContentPublicLocation>,
): void {
  const owners = new Map<string, string>();
  for (const location of locations.values()) {
    if (!owners.has(location.permalink)) {
      owners.set(location.permalink, location.slug);
    }
  }

  const byFolder = new Map<string, string[]>();
  for (const slug of locations.keys()) {
    const basename = lastSegment(slug);
    if (!isEntryBasename(basename)) continue;
    const folder = parentFolder(slug);
    const slugs = byFolder.get(folder);
    if (slugs) slugs.push(slug);
    else byFolder.set(folder, [slug]);
  }

  for (const slugs of byFolder.values()) {
    if (slugs.length !== 1) continue;
    const slug = slugs[0];
    const location = locations.get(slug);
    if (!location) continue;
    const basename = lastSegment(slug);
    if (!location.permalink.endsWith(`/${basename}`)) continue;
    const target = location.permalink.slice(
      0,
      location.permalink.length - basename.length,
    );
    if (!target.endsWith("/")) continue;
    const owner = owners.get(target);
    if (owner !== undefined && owner !== slug) continue;
    const redirects = [
      ...(location.redirects ?? []),
      { path: location.permalink, status: 301 as const },
    ];
    locations.set(slug, { ...location, permalink: target, redirects });
    owners.delete(location.permalink);
    owners.set(target, slug);
  }
}

export function buildFolderPages(manifest: ContentManifest): FolderPagesModel {
  const pagesByFolder = new Map<string, ContentManifestEntry[]>();
  const subfoldersOf = new Map<string, Set<string>>();
  const allFolders = new Set<string>();
  const routableBySlug = new Map<string, ContentManifestEntry>();
  const routablePermalinks = new Set<string>();

  for (const entry of manifest.publicEntries) {
    routableBySlug.set(entry.slug, entry);
    routablePermalinks.add(stripTrailingSlash(entry.permalink));
  }

  const addSubfolder = (parent: string, child: string): void => {
    const subs = subfoldersOf.get(parent);
    if (subs) subs.add(child);
    else subfoldersOf.set(parent, new Set([child]));
    allFolders.add(parent);
    allFolders.add(child);
  };

  for (const entry of manifest.discoverableEntries) {
    const slug = entry.slug;
    const basename = lastSegment(slug);
    const parent = parentFolder(slug);
    allFolders.add(parent);
    if (!isEntryBasename(basename)) {
      const pages = pagesByFolder.get(parent);
      if (pages) pages.push(entry);
      else pagesByFolder.set(parent, [entry]);
    }
    let child = parent;
    while (child !== "") {
      const grandparent = parentFolder(child);
      addSubfolder(grandparent, child);
      child = grandparent;
    }
  }

  const hasRoutableOwner = (folder: string): boolean =>
    routableBySlug.has(`${folder}/README`) ||
    routableBySlug.has(`${folder}/index`);

  const hasRoutablePage = (folder: string): boolean =>
    routableBySlug.has(folder);

  const sortedPages = (folder: string): ContentManifestEntry[] => {
    const subfolders = subfoldersOf.get(folder);
    const pages = (pagesByFolder.get(folder) ?? []).filter(
      (entry) => !subfolders?.has(entry.slug),
    );
    pages.sort(compareEntries);
    return pages;
  };

  const navigableCache = new Map<string, boolean>();
  const isNavigable = (folder: string): boolean => {
    const cached = navigableCache.get(folder);
    if (cached !== undefined) return cached;
    navigableCache.set(folder, false);
    let result =
      sortedPages(folder).length > 0 ||
      hasRoutableOwner(folder) ||
      hasRoutablePage(folder);
    if (!result) {
      for (const sub of subfoldersOf.get(folder) ?? []) {
        if (isListed(sub)) {
          result = true;
          break;
        }
      }
    }
    navigableCache.set(folder, result);
    return result;
  };

  const isListed = (folder: string): boolean =>
    hasRoutableOwner(folder) ||
    hasRoutablePage(folder) ||
    (isNavigable(folder) && generatedPath(folder) !== null);

  const generatedPath = (folder: string): string | null =>
    resolveGeneratedFolderLocation(manifest, folder);

  const folderLanguage = (folder: string): string | undefined => {
    let language: string | undefined;
    for (const entry of manifest.discoverableEntries) {
      if (!entry.slug.startsWith(`${folder}/`)) continue;
      const value = entry.publicLocation.language;
      if (value === undefined) return undefined;
      if (language === undefined) language = value;
      else if (language !== value) return undefined;
    }
    return language;
  };

  const folderLink = (folder: string): FolderPageLink | null => {
    if (hasRoutableOwner(folder)) {
      const owner =
        routableBySlug.get(`${folder}/README`) ??
        routableBySlug.get(`${folder}/index`);
      if (owner) return { title: owner.title, permalink: owner.permalink };
    }
    const page = routableBySlug.get(folder);
    if (page) return { title: page.title, permalink: page.permalink };
    const pathname = generatedPath(folder);
    if (!pathname) return null;
    return { title: lastSegment(folder), permalink: pathname };
  };

  const sortedSubfolders = (
    folder: string,
  ): { folder: string; link: FolderPageLink }[] => {
    const subs = [...(subfoldersOf.get(folder) ?? [])].flatMap((sub) => {
      if (!isListed(sub)) return [];
      const link = folderLink(sub);
      return link ? [{ folder: sub, link }] : [];
    });
    subs.sort((a, b) => compareLinks(a.link, b.link));
    return subs;
  };

  const folders = [...allFolders].filter((folder) => folder !== "");
  folders.sort(compareStrings);

  const pages: FolderPage[] = [];
  const takenPaths = new Set<string>();
  for (const folder of folders) {
    if (!isNavigable(folder)) continue;
    if (hasRoutableOwner(folder)) continue;
    if (hasRoutablePage(folder)) continue;
    const pathname = generatedPath(folder);
    if (!pathname) continue;
    if (pathname === "/") continue;
    if (routablePermalinks.has(stripTrailingSlash(pathname))) continue;
    if (takenPaths.has(pathname)) continue;
    takenPaths.add(pathname);
    const folders_ = sortedSubfolders(folder);
    pages.push({
      folder,
      pathname,
      language: folderLanguage(folder),
      title: lastSegment(folder),
      pages: sortedPages(folder).map(toLink),
      folders: folders_.map((sub) => sub.link),
      dependencies: [
        { type: "folder", folder },
        ...folders_.map<OutputDependency>((sub) => ({
          type: "folder",
          folder: sub.folder,
        })),
      ],
    });
  }

  pages.sort((a, b) => compareStrings(a.pathname, b.pathname));
  const byPath = new Map<string, FolderPage>();
  for (const page of pages) byPath.set(page.pathname, page);
  return { paths: pages.map((page) => page.pathname), byPath };
}

function isEntryBasename(basename: string): boolean {
  return ENTRY_BASENAMES.includes(basename as (typeof ENTRY_BASENAMES)[number]);
}

function toLink(entry: ContentManifestEntry): FolderPageLink {
  return { title: entry.title, permalink: entry.permalink };
}

function lastSegment(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? path : path.slice(index + 1);
}

function parentFolder(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

function stripTrailingSlash(url: string): string {
  if (url.length > 1 && url.endsWith("/")) return url.slice(0, -1);
  return url;
}

function compareEntries(
  a: ContentManifestEntry,
  b: ContentManifestEntry,
): number {
  return (
    compareStrings(a.permalink, b.permalink) ||
    compareStrings(a.title, b.title) ||
    compareStrings(a.slug, b.slug)
  );
}

function compareLinks(a: FolderPageLink, b: FolderPageLink): number {
  return (
    compareStrings(a.permalink, b.permalink) || compareStrings(a.title, b.title)
  );
}

function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
