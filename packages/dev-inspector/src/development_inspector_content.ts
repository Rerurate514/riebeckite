import type { CompletedContentBuildSnapshot } from "@riebeckite/core";

export type ContentInventoryEntry = {
  slug: string;
  title: string;
  permalink: string;
  language?: string;
  visibility: string;
  routable: boolean;
  discoverable: boolean;
  publishAt?: string;
  incomingLinks: number;
  aliases: string[];
  redirects: { from: string; to: string; status: number }[];
  unresolvedLinks: { raw: string; embed: boolean }[];
};

export type ContentInventory = {
  status: "available" | "unavailable";
  counts: {
    entries: number;
    public: number;
    unlisted: number;
    draft: number;
    scheduled: number;
    routable: number;
    discoverable: number;
    orphans: number;
    unresolvedLinks: number;
    ambiguousKeys: number;
  };
  entries: ContentInventoryEntry[];
  unresolved: { source: string; raw: string }[];
  ambiguities: { key: string; candidates: string[] }[];
  orphans: { slug: string; title: string; permalink: string }[];
};

export function inspectContentInventory(
  snapshot: CompletedContentBuildSnapshot | undefined,
): ContentInventory {
  if (!snapshot) {
    return {
      status: "unavailable",
      counts: {
        entries: 0,
        public: 0,
        unlisted: 0,
        draft: 0,
        scheduled: 0,
        routable: 0,
        discoverable: 0,
        orphans: 0,
        unresolvedLinks: 0,
        ambiguousKeys: 0,
      },
      entries: [],
      unresolved: [],
      ambiguities: [],
      orphans: [],
    };
  }

  const { manifest } = snapshot;
  const redirectsBySlug = new Map<
    string,
    { from: string; to: string; status: number }[]
  >();
  for (const [from, redirect] of manifest.redirects) {
    const redirects = redirectsBySlug.get(redirect.slug) ?? [];
    redirects.push({ from, to: redirect.path, status: redirect.status });
    redirectsBySlug.set(redirect.slug, redirects);
  }

  const unresolved: { source: string; raw: string }[] = [];
  const entries = [...manifest.entries]
    .sort((left, right) => left.slug.localeCompare(right.slug))
    .map((entry) => {
      const unresolvedLinks = entry.links
        .filter((link) => link.kind === "unresolved")
        .map((link) => ({ raw: link.raw, embed: link.embed }));
      for (const link of unresolvedLinks) {
        unresolved.push({ source: entry.slug, raw: link.raw });
      }
      return {
        slug: entry.slug,
        title: entry.title,
        permalink: entry.permalink,
        language: entry.publicLocation.language,
        visibility: entry.publishing.visibility,
        routable: entry.publishing.routable,
        discoverable: entry.publishing.discoverable,
        publishAt: entry.publishing.publishAt?.toISOString(),
        incomingLinks: manifest.incomingLinks.get(entry.slug)?.length ?? 0,
        aliases: [...(entry.aliases ?? [])],
        redirects: redirectsBySlug.get(entry.slug) ?? [],
        unresolvedLinks,
      };
    });

  const orphans = manifest.publicEntries
    .filter(
      (entry) => (manifest.incomingLinks.get(entry.slug)?.length ?? 0) === 0,
    )
    .sort((left, right) => left.slug.localeCompare(right.slug))
    .map((entry) => ({
      slug: entry.slug,
      title: entry.title,
      permalink: entry.permalink,
    }));

  const ambiguities = [...(manifest.contentIndexAmbiguities ?? [])]
    .map(([key, candidates]) => ({ key, candidates: [...candidates] }))
    .sort((left, right) => left.key.localeCompare(right.key));

  return {
    status: "available",
    counts: {
      entries: manifest.entries.length,
      public: manifest.entries.filter(
        (entry) => entry.publishing.visibility === "public",
      ).length,
      unlisted: manifest.entries.filter(
        (entry) => entry.publishing.visibility === "unlisted",
      ).length,
      draft: manifest.entries.filter(
        (entry) => entry.publishing.visibility === "draft",
      ).length,
      scheduled: manifest.entries.filter(
        (entry) => entry.publishing.visibility === "scheduled",
      ).length,
      routable: manifest.entries.filter((entry) => entry.publishing.routable)
        .length,
      discoverable: manifest.entries.filter(
        (entry) => entry.publishing.discoverable,
      ).length,
      orphans: orphans.length,
      unresolvedLinks: unresolved.length,
      ambiguousKeys: ambiguities.length,
    },
    entries,
    unresolved,
    ambiguities,
    orphans,
  };
}
