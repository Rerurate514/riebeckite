import type {
  ContentManifest,
  PublicContentEntry,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import type { WebmentionMention } from "./mention.js";
import type { WebmentionProvider } from "./provider.js";
import { entryPublicUrl, findTargetEntry } from "./targets.js";
import { urlComparisonKey } from "./url.js";

/**
 * Reads verified mentions for one entry. Application routes call this at
 * request/SSR time when they render mentions themselves instead of relying on
 * build-time injection.
 */
type WebmentionSnapshotInput = {
  readonly entry: PublicContentEntry;
  readonly mentions: readonly WebmentionMention[];
  readonly limit?: number;
};

type WebmentionQueryInput = {
  manifest: ContentManifest;
  config: ResolvedRiebeckiteConfig | undefined;
  provider: WebmentionProvider;
  slug: string;
  limit?: number;
};

export function getWebmentionsForEntry(
  input: Readonly<WebmentionSnapshotInput>,
): readonly WebmentionMention[];
export function getWebmentionsForEntry(
  input: Readonly<WebmentionQueryInput>,
): Promise<WebmentionMention[]>;
export function getWebmentionsForEntry(
  input: Readonly<WebmentionSnapshotInput | WebmentionQueryInput>,
): readonly WebmentionMention[] | Promise<WebmentionMention[]> {
  if ("mentions" in input) {
    return input.mentions
      .filter((mention) =>
        hasEntryTarget(mention.target, input.entry.permalink),
      )
      .toSorted(compareMentions)
      .slice(0, input.limit);
  }
  return queryWebmentionsForEntry(input);
}

function hasEntryTarget(target: string, permalink: string): boolean {
  try {
    return new URL(target).pathname === permalink;
  } catch {
    return false;
  }
}

export async function queryWebmentionsForEntry(
  input: WebmentionQueryInput,
): Promise<WebmentionMention[]> {
  const entry = input.manifest.bySlug.get(input.slug);
  if (!entry) return [];
  const target = entryPublicUrl(entry, input.config);
  if (target === null) return [];

  const result = await input.provider.query({
    type: "mentions_for_target",
    target,
    limit: input.limit,
  });
  return [...result.mentions].sort(compareMentions);
}

/**
 * Groups mentions by the manifest entry they target. Mentions whose target is
 * not a published entry are omitted; callers that need them can query the
 * provider directly.
 */
export function groupMentionsBySlug(
  manifest: ContentManifest,
  config: ResolvedRiebeckiteConfig | undefined,
  mentions: readonly WebmentionMention[],
): Map<string, WebmentionMention[]> {
  const byTarget = new Map<string, WebmentionMention[]>();
  for (const mention of mentions) {
    const key = urlComparisonKey(mention.target);
    const list = byTarget.get(key);
    if (list) list.push(mention);
    else byTarget.set(key, [mention]);
  }

  const grouped = new Map<string, WebmentionMention[]>();
  for (const entry of manifest.entries) {
    if (!entry.publishing.routable) continue;
    const target = entryPublicUrl(entry, config);
    if (target === null) continue;
    const list = byTarget.get(urlComparisonKey(target));
    if (list && list.length > 0) {
      grouped.set(entry.slug, [...list].sort(compareMentions));
    }
  }
  return grouped;
}

/** Counts mentions whose target does not match a published entry. */
export function countUnmatchedMentions(
  manifest: ContentManifest,
  config: ResolvedRiebeckiteConfig | undefined,
  mentions: readonly WebmentionMention[],
): number {
  let unmatched = 0;
  for (const mention of mentions) {
    if (findTargetEntry(manifest, config, mention.target) === undefined) {
      unmatched += 1;
    }
  }
  return unmatched;
}

export function compareMentions(
  left: WebmentionMention,
  right: WebmentionMention,
): number {
  return (
    (right.publishedAt ?? right.verifiedAt).localeCompare(
      left.publishedAt ?? left.verifiedAt,
    ) || left.source.localeCompare(right.source)
  );
}
