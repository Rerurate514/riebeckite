import { createHash } from "node:crypto";
import { stableStringify } from "../plugin/plugin_memo.js";
import type {
  ContentManifest,
  ContentManifestEntry,
  FolderLocation,
} from "../types/content_manifest.js";
import type {
  ManifestHookCacheContract,
  ManifestHookCacheEntry,
  ManifestHookSnapshot,
} from "./content_build_state.js";

export function fingerprintManifestHookInput(
  manifest: ContentManifest,
): string {
  return fingerprintManifest(manifestFingerprintValue(manifest));
}

export function createManifestHookCacheEntry(
  pluginName: string,
  cacheable: boolean,
  pipelineFingerprint: string | undefined,
  inputFingerprint: string,
  manifest: ContentManifest,
  contract: ManifestHookCacheContract | undefined,
): ManifestHookCacheEntry {
  const snapshot: ManifestHookSnapshot = {
    entries: JSON.parse(
      JSON.stringify(manifest.entries),
    ) as ContentManifestEntry[],
    ...(contract?.mutations.includes("folderLocations")
      ? { folderLocations: snapshotFolderLocations(manifest) }
      : {}),
  };
  return {
    pluginName,
    cacheable,
    pipelineFingerprint,
    inputFingerprint,
    outputFingerprint: fingerprintManifestHookSnapshot(snapshot, manifest),
    ...(contract === undefined ? {} : { contract }),
    snapshot,
  };
}

export function fingerprintManifestHookSideEffects(
  manifest: ContentManifest,
  contract: ManifestHookCacheContract | undefined,
): string {
  const value = {
    ...manifest,
    entries: [],
    ...(contract?.mutations.includes("folderLocations")
      ? { folderLocations: new Map<string, FolderLocation>() }
      : {}),
  };
  return fingerprintManifest(manifestFingerprintValue(value));
}

export function fingerprintManifestHookSnapshot(
  snapshot: ManifestHookSnapshot,
  manifest: ContentManifest,
): string {
  return fingerprintManifest(
    manifestFingerprintValue({
      ...manifest,
      entries: [...snapshot.entries],
      ...(snapshot.folderLocations === undefined
        ? {}
        : {
            folderLocations: new Map(
              snapshot.folderLocations.map((location) => [
                location.pathname,
                location,
              ]),
            ),
          }),
    }),
  );
}

export function applyManifestHookSnapshot(
  manifest: ContentManifest,
  snapshot: ManifestHookSnapshot,
): boolean {
  try {
    const entries = structuredClone(snapshot.entries) as ContentManifestEntry[];
    if (!entries.every(isManifestEntry)) return false;
    const entriesBySlug = new Map(entries.map((entry) => [entry.slug, entry]));
    if (entriesBySlug.size !== entries.length) return false;
    const folderLocations =
      snapshot.folderLocations === undefined
        ? undefined
        : restoreFolderLocations(snapshot.folderLocations);
    if (snapshot.folderLocations !== undefined && folderLocations === undefined)
      return false;
    manifest.entries = entries;
    if (folderLocations !== undefined)
      manifest.folderLocations = folderLocations;
    manifest.publicEntries = manifest.publicEntries
      .map((entry) => entriesBySlug.get(entry.slug))
      .filter((entry): entry is ContentManifestEntry => entry !== undefined);
    manifest.discoverableEntries = manifest.discoverableEntries
      .map((entry) => entriesBySlug.get(entry.slug))
      .filter((entry): entry is ContentManifestEntry => entry !== undefined);
    manifest.bySlug = new Map(entries.map((entry) => [entry.slug, entry]));
    manifest.byContentId = new Map(
      entries
        .filter((entry) => entry.contentId !== undefined)
        .map((entry) => [entry.contentId as string, entry]),
    );
    manifest.byPermalink = new Map(
      entries.map((entry) => [entry.permalink, entry]),
    );
    manifest.byRoutablePermalink = new Map(
      manifest.publicEntries.map((entry) => [entry.permalink, entry]),
    );
    manifest.byAlias = new Map();
    manifest.byTag = new Map();
    manifest.byAsset = new Map();
    manifest.outgoingLinks = new Map();
    manifest.incomingLinks = new Map();
    for (const entry of entries) {
      manifest.outgoingLinks.set(entry.slug, entry.links);
      for (const alias of entry.aliases ?? []) {
        const aliases = manifest.byAlias.get(alias.toLowerCase()) ?? [];
        aliases.push(entry);
        manifest.byAlias.set(alias.toLowerCase(), aliases);
      }
      for (const tag of entry.tags) {
        const tagged = manifest.byTag.get(tag) ?? [];
        tagged.push(entry);
        manifest.byTag.set(tag, tagged);
      }
      for (const asset of entry.assets) {
        const assets = manifest.byAsset.get(asset.path) ?? [];
        assets.push(entry);
        manifest.byAsset.set(asset.path, assets);
      }
      for (const link of entry.links) {
        if (
          link.kind !== "note" ||
          link.slug === null ||
          link.slug === entry.slug
        )
          continue;
        const incoming = manifest.incomingLinks.get(link.slug) ?? [];
        if (!incoming.includes(entry.slug)) incoming.push(entry.slug);
        manifest.incomingLinks.set(link.slug, incoming);
      }
    }
    for (const entry of entries)
      entry.backlinks = manifest.incomingLinks.get(entry.slug) ?? [];
    return true;
  } catch {
    return false;
  }
}

function snapshotFolderLocations(
  manifest: ContentManifest,
): readonly FolderLocation[] {
  return [...manifest.folderLocations.values()]
    .map(normalizeFolderLocation)
    .sort((left, right) => left.pathname.localeCompare(right.pathname));
}

function restoreFolderLocations(
  locations: readonly FolderLocation[],
): Map<string, FolderLocation> | undefined {
  const normalized = locations.map(normalizeFolderLocation);
  if (
    normalized.some((location) => location.pathname === "") ||
    new Set(normalized.map((location) => location.pathname)).size !==
      normalized.length
  )
    return undefined;
  return new Map(normalized.map((location) => [location.pathname, location]));
}

function normalizeFolderLocation(location: FolderLocation): FolderLocation {
  return {
    pathname: location.pathname,
    ...(location.folder === undefined ? {} : { folder: location.folder }),
    ...(location.language === undefined ? {} : { language: location.language }),
  };
}

function manifestFingerprintValue(manifest: ContentManifest) {
  return {
    entries: manifest.entries,
    publicEntries: manifest.publicEntries.map((entry) => entry.slug),
    discoverableEntries: manifest.discoverableEntries.map(
      (entry) => entry.slug,
    ),
    redirects: [...manifest.redirects.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    ),
    publicRedirects: [...manifest.publicRedirects.entries()].sort(
      ([left], [right]) => left.localeCompare(right),
    ),
    assets: manifest.assets,
    clientEntries: manifest.clientEntries,
    diagnostics: manifest.diagnostics,
    generatedOutputs: manifest.generatedOutputs,
    folderLocations: [...manifest.folderLocations.entries()].sort(
      ([left], [right]) => left.localeCompare(right),
    ),
    pageRoutes: manifest.pageRoutes,
    pagePaths: manifest.pagePaths,
  } as never;
}

function fingerprintManifest(value: unknown): string {
  const normalized = JSON.parse(JSON.stringify(value));
  return createHash("sha256").update(stableStringify(normalized)).digest("hex");
}

function isManifestEntry(value: unknown): value is ContentManifestEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ContentManifestEntry).slug === "string" &&
    typeof (value as ContentManifestEntry).html === "string"
  );
}
