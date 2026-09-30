import { type WebmentionMention, webmentionKey } from "./mention.js";
import {
  assertWebmentionQuerySupported,
  WEBMENTION_CAPABILITIES,
  type WebmentionProvider,
} from "./provider.js";
import type { WebmentionQuery, WebmentionQueryResult } from "./query.js";
import { urlComparisonKey } from "./url.js";

/**
 * In-memory provider for tests, local previews, and provider contract
 * examples. State lives for the lifetime of the process/isolate only.
 */
export class MemoryWebmentionProvider implements WebmentionProvider {
  readonly capabilities = new Set(WEBMENTION_CAPABILITIES);
  readonly #mentions = new Map<string, WebmentionMention>();

  constructor(initialMentions: readonly WebmentionMention[] = []) {
    for (const mention of initialMentions) {
      this.#mentions.set(webmentionKey(mention), mention);
    }
  }

  async store(mention: WebmentionMention): Promise<void> {
    this.#mentions.set(webmentionKey(mention), mention);
  }

  async query(query: WebmentionQuery): Promise<WebmentionQueryResult> {
    assertWebmentionQuerySupported(this, query);
    const since = query.type === "all_mentions" ? query.since : undefined;
    const mentions = [...this.#mentions.values()].filter((mention) =>
      withinSince(mention, since),
    );

    if (query.type === "mentions_for_target") {
      const key = urlComparisonKey(query.target);
      return {
        type: query.type,
        target: query.target,
        mentions: applyLimit(
          mentions
            .filter((mention) => urlComparisonKey(mention.target) === key)
            .sort(compareMentions),
          query.limit,
        ),
      };
    }

    return {
      type: query.type,
      mentions: applyLimit(mentions.sort(compareMentions), query.limit),
    };
  }
}

function withinSince(
  mention: WebmentionMention,
  since: string | undefined,
): boolean {
  return since === undefined || mention.verifiedAt >= since;
}

function applyLimit(
  mentions: WebmentionMention[],
  limit: number | undefined,
): WebmentionMention[] {
  if (limit === undefined) return mentions;
  return mentions.slice(0, Math.max(0, limit));
}

function compareMentions(
  left: WebmentionMention,
  right: WebmentionMention,
): number {
  return (
    (right.publishedAt ?? right.verifiedAt).localeCompare(
      left.publishedAt ?? left.verifiedAt,
    ) || left.source.localeCompare(right.source)
  );
}
