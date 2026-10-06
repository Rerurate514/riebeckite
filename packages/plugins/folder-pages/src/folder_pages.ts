import type {
  ContentManifest,
  ContentManifestEntry,
  ContentPublicLocation,
  OutputDependency,
} from "@riebeckite/core";
import { resolveGeneratedFolderLocation } from "@riebeckite/core";
import type { FolderPage, FolderPageLink, FolderPagesModel } from "./types.js";

const ENTRY_BASENAMES = ["README", "index"] as const;

type Language = string | undefined;

export function collapseFolderEntryLocations(
  locations: Map<string, ContentPublicLocation>,
): void {
  const owners = new Map<string, string>();
  for (const location of locations.values()) {
    if (!owners.has(location.permalink)) {
      owners.set(location.permalink, location.slug);
    }
  }

  const byFolderLanguage = new Map<string, string[]>();
  for (const [slug, location] of locations) {
    const basename = entryBaseSegment(slug, location.language);
    if (!isEntryBasename(basename)) continue;
    const key = languageKey(parentFolder(slug), location.language);
    const slugs = byFolderLanguage.get(key);
    if (slugs) slugs.push(slug);
    else byFolderLanguage.set(key, [slug]);
  }

  for (const slugs of byFolderLanguage.values()) {
    if (slugs.length !== 1) continue;
    const slug = slugs[0];
    if (slug === undefined) continue;
    const location = locations.get(slug);
    if (!location) continue;
    const basename = entryBaseSegment(slug, location.language);
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
  const routableBySlug = new Map<string, ContentManifestEntry>();
  const routablePermalinks = new Set<string>();

  for (const entry of manifest.publicEntries) {
    routableBySlug.set(entry.slug, entry);
    routablePermalinks.add(stripTrailingSlash(entry.permalink));
  }

  const allFolders = new Set<string>();
  const folderLanguages = new Map<string, Set<Language>>();
  const pagesByFolderLanguage = new Map<
    string,
    Map<Language, ContentManifestEntry[]>
  >();
  const subfolders = new Map<string, Map<Language, Set<string>>>();

  const addLanguage = (folder: string, language: Language): void => {
    const set = folderLanguages.get(folder);
    if (set) set.add(language);
    else folderLanguages.set(folder, new Set([language]));
  };

  const addPage = (
    folder: string,
    language: Language,
    entry: ContentManifestEntry,
  ): void => {
    let byLanguage = pagesByFolderLanguage.get(folder);
    if (!byLanguage) {
      byLanguage = new Map();
      pagesByFolderLanguage.set(folder, byLanguage);
    }
    const entries = byLanguage.get(language);
    if (entries) entries.push(entry);
    else byLanguage.set(language, [entry]);
  };

  const addSubfolder = (
    parent: string,
    language: Language,
    child: string,
  ): void => {
    let byLanguage = subfolders.get(parent);
    if (!byLanguage) {
      byLanguage = new Map();
      subfolders.set(parent, byLanguage);
    }
    const set = byLanguage.get(language);
    if (set) set.add(child);
    else byLanguage.set(language, new Set([child]));
  };

  for (const entry of manifest.discoverableEntries) {
    const language = entry.publicLocation.language;
    const folder = parentFolder(entry.slug);
    allFolders.add(folder);
    let child = folder;
    while (child !== "") {
      addLanguage(child, language);
      const grandparent = parentFolder(child);
      addSubfolder(grandparent, language, child);
      child = grandparent;
    }
    if (isEntryBasename(entryBaseSegment(entry.slug, language))) continue;
    if (folder !== "") addPage(folder, language, entry);
  }

  const owners = new Map<string, ContentManifestEntry>();
  for (const entry of manifest.publicEntries) {
    const language = entry.publicLocation.language;
    const basename = entryBaseSegment(entry.slug, language);
    if (!isEntryBasename(basename)) continue;
    const folder = parentFolder(entry.slug);
    if (folder === "") continue;
    const key = languageKey(folder, language);
    const existing = owners.get(key);
    if (!existing || basename === "README") owners.set(key, entry);
  }

  const hasOwner = (folder: string, language: Language): boolean =>
    owners.has(languageKey(folder, language));

  const hasRoutablePage = (folder: string, language: Language): boolean => {
    const entry = routableBySlug.get(folder);
    return entry !== undefined && entry.publicLocation.language === language;
  };

  const generatedPath = (folder: string, language: Language): string | null =>
    resolveGeneratedFolderLocation(manifest, folder, language);

  const subfoldersFor = (folder: string, language: Language): Set<string> =>
    subfolders.get(folder)?.get(language) ?? new Set();

  const sortedPages = (
    folder: string,
    language: Language,
  ): ContentManifestEntry[] => {
    const subs = subfoldersFor(folder, language);
    const pages = (
      pagesByFolderLanguage.get(folder)?.get(language) ?? []
    ).filter((entry) => !subs.has(entry.slug));
    pages.sort(compareEntries);
    return pages;
  };

  const navigableCache = new Map<string, boolean>();
  const isNavigable = (folder: string, language: Language): boolean => {
    const key = languageKey(folder, language);
    const cached = navigableCache.get(key);
    if (cached !== undefined) return cached;
    navigableCache.set(key, false);
    let result =
      sortedPages(folder, language).length > 0 ||
      hasOwner(folder, language) ||
      hasRoutablePage(folder, language);
    if (!result) {
      for (const sub of subfoldersFor(folder, language)) {
        if (isListed(sub, language)) {
          result = true;
          break;
        }
      }
    }
    navigableCache.set(key, result);
    return result;
  };

  const isListed = (folder: string, language: Language): boolean =>
    hasOwner(folder, language) ||
    hasRoutablePage(folder, language) ||
    (isNavigable(folder, language) && generatedPath(folder, language) !== null);

  const folderLink = (
    folder: string,
    language: Language,
  ): FolderPageLink | null => {
    const owner = owners.get(languageKey(folder, language));
    if (owner) return { title: owner.title, permalink: owner.permalink };
    const page = hasRoutablePage(folder, language)
      ? routableBySlug.get(folder)
      : undefined;
    if (page) return { title: page.title, permalink: page.permalink };
    const pathname = generatedPath(folder, language);
    if (!pathname) return null;
    return { title: lastSegment(folder), permalink: pathname };
  };

  const sortedSubfolders = (
    folder: string,
    language: Language,
  ): { folder: string; link: FolderPageLink }[] => {
    const subs = [...subfoldersFor(folder, language)].flatMap((sub) => {
      if (!isListed(sub, language)) return [];
      const link = folderLink(sub, language);
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
    for (const language of sortedLanguages(folderLanguages.get(folder))) {
      if (!isNavigable(folder, language)) continue;
      if (hasOwner(folder, language)) continue;
      if (hasRoutablePage(folder, language)) continue;
      const pathname = generatedPath(folder, language);
      if (!pathname) continue;
      if (pathname === "/") continue;
      if (routablePermalinks.has(stripTrailingSlash(pathname))) continue;
      if (takenPaths.has(pathname)) continue;
      takenPaths.add(pathname);
      const folderLinks = sortedSubfolders(folder, language);
      pages.push({
        folder,
        pathname,
        language,
        title: lastSegment(folder),
        pages: sortedPages(folder, language).map(toLink),
        folders: folderLinks.map((sub) => sub.link),
        dependencies: [
          { type: "folder", folder },
          ...folderLinks.map<OutputDependency>((sub) => ({
            type: "folder",
            folder: sub.folder,
          })),
        ],
      });
    }
  }

  pages.sort((a, b) => compareStrings(a.pathname, b.pathname));
  const byPath = new Map<string, FolderPage>();
  for (const page of pages) byPath.set(page.pathname, page);
  return { paths: pages.map((page) => page.pathname), byPath };
}

function languageKey(folder: string, language: Language): string {
  return `${folder}\u0000${language ?? ""}`;
}

function entryBaseSegment(slug: string, language: Language): string {
  const segment = lastSegment(slug);
  if (!language) return segment;
  return segment.replace(
    new RegExp(`[._-]${escapeRegExp(language)}$`, "i"),
    "",
  );
}

function sortedLanguages(languages: Set<Language> | undefined): Language[] {
  return [...(languages ?? [])].sort((a, b) => {
    const left = a ?? "";
    const right = b ?? "";
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  });
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
