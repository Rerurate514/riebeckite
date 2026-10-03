import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest.js";

export type FolderEntryKind = "readme" | "index" | "folder";

export type FolderEntryScope = "routable" | "discoverable" | "all";

export type FolderEntryCandidate = {
  readonly kind: FolderEntryKind;
  readonly entry: ContentManifestEntry;
};

export type FolderEntryResolution =
  | { readonly type: "none" }
  | {
      readonly type: "resolved";
      readonly kind: FolderEntryKind;
      readonly entry: ContentManifestEntry;
    }
  | {
      readonly type: "ambiguous";
      readonly candidates: readonly FolderEntryCandidate[];
    };

export type ResolveFolderEntryOptions = {
  readonly scope?: FolderEntryScope;
};

export type FolderLocationResolution =
  | { readonly type: "none" }
  | { readonly type: "content"; readonly entry: ContentManifestEntry }
  | { readonly type: "generated"; readonly pathname: string }
  | {
      readonly type: "ambiguous";
      readonly candidates: readonly FolderEntryCandidate[];
    };

export function resolveFolderEntry(
  manifest: ContentManifest,
  folder: string,
  options: ResolveFolderEntryOptions = {},
): FolderEntryResolution {
  const base = normalizeFolder(folder);
  const scope = options.scope ?? "routable";
  const candidates: FolderEntryCandidate[] = [];
  for (const [kind, slug] of folderEntrySlugs(base)) {
    if (slug === null) continue;
    const entry = manifest.bySlug.get(slug);
    if (!entry || !isInScope(entry, scope)) continue;
    candidates.push({ kind, entry });
  }
  if (candidates.length === 0) return { type: "none" };
  const candidate = candidates[0];
  if (candidates.length === 1 && candidate) {
    return { type: "resolved", kind: candidate.kind, entry: candidate.entry };
  }
  return { type: "ambiguous", candidates };
}

export function resolveFolderLocation(
  manifest: ContentManifest,
  folder: string,
): FolderLocationResolution {
  const resolution = resolveFolderEntry(manifest, folder);
  const candidates =
    resolution.type === "ambiguous"
      ? resolution.candidates.filter((candidate) => candidate.kind !== "folder")
      : resolution.type === "resolved" && resolution.kind !== "folder"
        ? [{ kind: resolution.kind, entry: resolution.entry }]
        : [];
  if (candidates.length === 1) {
    const candidate = candidates[0];
    if (candidate) return { type: "content", entry: candidate.entry };
  }
  if (candidates.length > 1) return { type: "ambiguous", candidates };

  const location = manifest.folderLocations.get(normalizeFolder(folder));
  return location
    ? { type: "generated", pathname: location.pathname }
    : { type: "none" };
}

export function resolvePublicFolderLocation(
  manifest: ContentManifest,
  pathname: string,
): FolderLocationResolution {
  const normalizedPathname = normalizePathname(pathname);
  const entry = manifest.publicEntries.find(
    (candidate) =>
      normalizePathname(candidate.publicLocation.permalink) ===
      normalizedPathname,
  );
  if (entry) return { type: "content", entry };

  const location = [...manifest.folderLocations.values()].find(
    (candidate) => normalizePathname(candidate.pathname) === normalizedPathname,
  );
  return location
    ? { type: "generated", pathname: location.pathname }
    : { type: "none" };
}

export function resolveGeneratedFolderLocation(
  manifest: ContentManifest,
  folder: string,
): string | null {
  const normalizedFolder = normalizeFolder(folder);
  if (!normalizedFolder) return null;
  const candidates = new Set<string>();
  const prefix = `${normalizedFolder}/`;
  for (const entry of manifest.publicEntries) {
    if (!entry.slug.startsWith(prefix)) continue;
    const remainder = entry.slug
      .slice(prefix.length)
      .split("/")
      .filter(Boolean);
    const pathname = parentPath(
      entry.publicLocation.permalink,
      remainder.length,
    );
    if (pathname) candidates.add(pathname);
  }
  return candidates.size === 1 ? ([...candidates][0] ?? null) : null;
}

function folderEntrySlugs(
  base: string,
): readonly (readonly [FolderEntryKind, string | null])[] {
  const prefix = base === "" ? "" : `${base}/`;
  return [
    ["readme", `${prefix}README`],
    ["index", `${prefix}index`],
    ["folder", base === "" ? null : base],
  ];
}

function isInScope(
  entry: ContentManifestEntry,
  scope: FolderEntryScope,
): boolean {
  if (scope === "all") return true;
  if (scope === "discoverable") return entry.publishing.discoverable;
  return entry.publishing.routable;
}

function normalizeFolder(folder: string): string {
  return folder.split("/").filter(Boolean).join("/");
}

function normalizePathname(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

function parentPath(pathname: string, levels: number): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < levels) return null;
  const parent = segments.slice(0, -levels);
  return parent.length === 0 ? "/" : `/${parent.join("/")}/`;
}
