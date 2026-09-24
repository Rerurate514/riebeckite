import type {
  ContentLink,
  ContentManifestEntry,
} from "../types/content_manifest";

export type ContentGraphSource = {
  entries: ContentManifestEntry[];
  bySlug: Map<string, ContentManifestEntry>;
  outgoingLinks: Map<string, ContentLink[]>;
  incomingLinks: Map<string, string[]>;
};

export type ContentGraph = {
  nodes(): ContentManifestEntry[];
  get(slug: string): ContentManifestEntry | null;
  outgoing(slug: string): ContentManifestEntry[];
  incoming(slug: string): ContentManifestEntry[];
  neighbors(slug: string): ContentManifestEntry[];
  outgoingSlugs(slug: string): string[];
  incomingSlugs(slug: string): string[];
  neighborSlugs(slug: string): string[];
};

export function createContentGraph(manifest: ContentGraphSource): ContentGraph {
  return {
    nodes: () => [...manifest.entries],
    get: (slug) => manifest.bySlug.get(slug) ?? null,
    outgoing: (slug) => toEntries(manifest, getOutgoingSlugs(manifest, slug)),
    incoming: (slug) => toEntries(manifest, getIncomingSlugs(manifest, slug)),
    neighbors: (slug) => toEntries(manifest, getNeighborSlugs(manifest, slug)),
    outgoingSlugs: (slug) => getOutgoingSlugs(manifest, slug),
    incomingSlugs: (slug) => getIncomingSlugs(manifest, slug),
    neighborSlugs: (slug) => getNeighborSlugs(manifest, slug),
  };
}

function getOutgoingSlugs(
  manifest: ContentGraphSource,
  slug: string,
): string[] {
  const links = manifest.outgoingLinks.get(slug) ?? [];
  return uniqueStrings(
    links
      .filter(isResolvedNoteLink)
      .map((link) => link.slug)
      .filter((targetSlug) => targetSlug !== slug),
  );
}

function getIncomingSlugs(
  manifest: ContentGraphSource,
  slug: string,
): string[] {
  return manifest.incomingLinks.get(slug) ?? [];
}

function getNeighborSlugs(
  manifest: ContentGraphSource,
  slug: string,
): string[] {
  return uniqueStrings([
    ...getOutgoingSlugs(manifest, slug),
    ...getIncomingSlugs(manifest, slug),
  ]);
}

function toEntries(
  manifest: ContentGraphSource,
  slugs: string[],
): ContentManifestEntry[] {
  return slugs
    .map((slug) => manifest.bySlug.get(slug) ?? null)
    .filter((entry): entry is ContentManifestEntry => entry !== null);
}

function isResolvedNoteLink(
  link: ContentLink,
): link is ContentLink & { slug: string } {
  return link.kind === "note" && link.slug !== null;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}
