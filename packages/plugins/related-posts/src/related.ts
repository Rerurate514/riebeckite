import {
  type ContentLink,
  type ContentManifest,
  type ContentManifestEntry,
  isPublished,
  type ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import type {
  RelatedPostsEntry,
  ResolvedRelatedPostsOptions,
} from "./types.js";

/**
 * Weights are deterministic constants: the same manifest always produces the
 * same ranking. A direct link is the strongest signal, a shared tag is next,
 * and a co-citation (both entries linking to the same note) is the weakest.
 */
/** Added once for each entry reachable through a direct link. */
export const DIRECT_LINK_WEIGHT = 3;
/** Added once per tag shared with the source entry. */
export const SHARED_TAG_WEIGHT = 2;
/** Added once per note that both entries link to. */
export const CO_CITATION_WEIGHT = 1;

export type BuildRelatedPostsArgs = {
  manifest: ContentManifest;
  entry: ContentManifestEntry;
  options: ResolvedRelatedPostsOptions;
  config?: ResolvedRiebeckiteConfig;
};

/**
 * Ranks the published entries related to `entry` using the manifest's content
 * graph. Pure build-time computation: it only reads `byTag`, `outgoingLinks`,
 * `incomingLinks`, `redirects`, and `bySlug`.
 */
export function buildRelatedPosts(
  args: BuildRelatedPostsArgs,
): RelatedPostsEntry[] {
  const { manifest, entry, options } = args;
  const scores = new Map<string, number>();

  const outgoingTargets = collectNoteTargets(
    manifest.outgoingLinks.get(entry.slug) ?? [],
    entry.slug,
  );

  if (options.useTags) {
    for (const tag of entry.tags) {
      for (const candidate of manifest.byTag.get(tag) ?? []) {
        if (candidate.slug === entry.slug) continue;
        addScore(scores, candidate.slug, SHARED_TAG_WEIGHT);
      }
    }
  }

  if (options.useBacklinks) {
    const incoming = manifest.incomingLinks.get(entry.slug) ?? [];
    for (const slug of new Set([...outgoingTargets, ...incoming])) {
      if (slug === entry.slug) continue;
      addScore(scores, slug, DIRECT_LINK_WEIGHT);
    }
  }

  // Co-citation: entries that link to a note the source entry also links to.
  for (const target of outgoingTargets) {
    for (const source of manifest.incomingLinks.get(target) ?? []) {
      if (source === entry.slug) continue;
      addScore(scores, source, CO_CITATION_WEIGHT);
    }
  }

  const candidates: RelatedPostsEntry[] = [];
  for (const [slug, score] of scores) {
    if (score < options.minScore) continue;
    const candidate = manifest.bySlug.get(slug);
    if (!candidate) continue;
    if (!isEligibleRelatedEntry(candidate, manifest, args.config)) continue;
    candidates.push({
      slug: candidate.slug,
      permalink: candidate.permalink,
      title: candidate.title,
      score,
    });
  }

  candidates.sort(compareRelatedEntries);
  return candidates.slice(0, options.limit);
}

/**
 * An entry may receive a related-posts section (and be offered as a related
 * candidate) only when it is published and its canonical permalink is not
 * shadowed by a redirect. Unpublished and redirect-only entries are skipped.
 */
export function isEligibleRelatedEntry(
  entry: ContentManifestEntry,
  manifest: ContentManifest,
  config?: ResolvedRiebeckiteConfig,
): boolean {
  if (manifest.redirects.has(entry.permalink)) return false;
  if (config) return isPublished(config, entry.frontmatter);
  return (
    entry.frontmatter.private !== true &&
    entry.frontmatter.draft !== true &&
    entry.frontmatter.publish !== false
  );
}

function compareRelatedEntries(
  a: RelatedPostsEntry,
  b: RelatedPostsEntry,
): number {
  if (b.score !== a.score) return b.score - a.score;
  const byTitle = a.title.localeCompare(b.title);
  if (byTitle !== 0) return byTitle;
  return a.slug.localeCompare(b.slug);
}

function collectNoteTargets(
  links: readonly ContentLink[],
  sourceSlug: string,
): string[] {
  const targets = new Set<string>();
  for (const link of links) {
    if (link.kind !== "note" || link.slug === null) continue;
    if (link.slug === sourceSlug) continue;
    targets.add(link.slug);
  }
  return [...targets];
}

function addScore(
  scores: Map<string, number>,
  slug: string,
  weight: number,
): void {
  scores.set(slug, (scores.get(slug) ?? 0) + weight);
}
