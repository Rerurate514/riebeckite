import { createHash } from "node:crypto";
import { stableStringify } from "../plugin/plugin_memo.js";
import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest.js";
import type {
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
): ManifestHookCacheEntry {
  const snapshot: ManifestHookSnapshot = {
    entries: JSON.parse(
      JSON.stringify(manifest.entries),
    ) as ContentManifestEntry[],
  };
  return {
    pluginName,
    cacheable,
    pipelineFingerprint,
    inputFingerprint,
    outputFingerprint: fingerprintManifestHookSnapshot(snapshot, manifest),
    snapshot,
  };
}

export function fingerprintManifestHookSideEffects(
  manifest: ContentManifest,
): string {
  const value = {
    ...manifest,
    entries: [],
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
    manifest.entries = entries;
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
