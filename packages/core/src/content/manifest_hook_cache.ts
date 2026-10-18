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

export function serializeManifestEntries(
  entries: readonly ContentManifestEntry[],
): Map<string, string> {
  const serialized = new Map<string, string>();
  for (const entry of entries)
    serialized.set(entry.slug, JSON.stringify(entry));
  return serialized;
}

export function createManifestHookCacheEntry(
  pluginName: string,
  cacheable: boolean,
  pipelineFingerprint: string | undefined,
  inputFingerprint: string,
  manifest: ContentManifest,
  beforeEntries: ReadonlyMap<string, string>,
  afterEntries: ReadonlyMap<string, string>,
): ManifestHookCacheEntry {
  if (!cacheable)
    return {
      pluginName,
      cacheable,
      pipelineFingerprint,
      inputFingerprint,
    };
  return {
    pluginName,
    cacheable,
    pipelineFingerprint,
    inputFingerprint,
    outputFingerprint: fingerprintManifestHookSnapshot(manifest),
    snapshot: createManifestHookSnapshot(beforeEntries, afterEntries),
  };
}

function createManifestHookSnapshot(
  beforeEntries: ReadonlyMap<string, string>,
  afterEntries: ReadonlyMap<string, string>,
): ManifestHookSnapshot {
  const changed: ContentManifestEntry[] = [];
  const order: string[] = [];
  for (const [slug, serialized] of afterEntries) {
    order.push(slug);
    if (beforeEntries.get(slug) === serialized) continue;
    changed.push(JSON.parse(serialized) as ContentManifestEntry);
  }
  const beforeOrder = [...beforeEntries.keys()];
  const orderChanged =
    beforeOrder.length !== order.length ||
    beforeOrder.some((slug, index) => slug !== order[index]);
  return orderChanged ? { entries: changed, order } : { entries: changed };
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
  manifest: ContentManifest,
): string {
  return fingerprintManifest(manifestFingerprintValue(manifest));
}

export type ManifestHookRestorePoint = {
  readonly entries: readonly ContentManifestEntry[];
  readonly publicEntries: ContentManifest["publicEntries"];
  readonly discoverableEntries: ContentManifest["discoverableEntries"];
};

export function captureManifestHookRestorePoint(
  manifest: ContentManifest,
): ManifestHookRestorePoint {
  return {
    entries: manifest.entries,
    publicEntries: manifest.publicEntries,
    discoverableEntries: manifest.discoverableEntries,
  };
}

export function restoreManifestHookEntries(
  manifest: ContentManifest,
  point: ManifestHookRestorePoint,
): boolean {
  try {
    manifest.publicEntries = point.publicEntries;
    manifest.discoverableEntries = point.discoverableEntries;
    const entriesBySlug = new Map(
      point.entries.map((entry) => [entry.slug, entry]),
    );
    if (entriesBySlug.size !== point.entries.length) return false;
    return commitManifestEntries(manifest, entriesBySlug);
  } catch {
    return false;
  }
}

export function applyManifestHookSnapshot(
  manifest: ContentManifest,
  snapshot: ManifestHookSnapshot,
): boolean {
  try {
    const entriesBySlug = new Map(
      manifest.entries.map((entry) => [entry.slug, entry]),
    );
    const delta: ContentManifestEntry[] = [];
    for (const entry of structuredClone(snapshot.entries).map(
      reviveManifestEntry,
    )) {
      if (entry === null || !isManifestEntry(entry)) return false;
      delta.push(entry);
    }
    for (const entry of delta) entriesBySlug.set(entry.slug, entry);
    return commitManifestEntries(manifest, entriesBySlug, snapshot.order);
  } catch {
    return false;
  }
}

function commitManifestEntries(
  manifest: ContentManifest,
  entriesBySlug: Map<string, ContentManifestEntry>,
  order?: readonly string[],
): boolean {
  let entries: ContentManifestEntry[];
  if (order) {
    entries = [];
    for (const slug of order) {
      const entry = entriesBySlug.get(slug);
      if (!entry) return false;
      entries.push(entry);
    }
    if (entries.length !== entriesBySlug.size) return false;
  } else {
    entries = [...entriesBySlug.values()];
  }
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
}

function reviveManifestEntry(
  entry: ContentManifestEntry,
): ContentManifestEntry | null {
  const publishAt = entry.publishing.publishAt;
  if (typeof publishAt !== "string") return entry;
  const parsed = new Date(publishAt);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    ...entry,
    publishing: { ...entry.publishing, publishAt: parsed },
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
