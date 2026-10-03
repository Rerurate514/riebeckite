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
