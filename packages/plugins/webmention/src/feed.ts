import type {
  ContentManifest,
  PluginEndpointContext,
  PluginEndpointResponse,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { errorResponse } from "./http.js";
import type { WebmentionMention } from "./mention.js";
import {
  supportsWebmentionCapability,
  UnsupportedWebmentionQueryError,
  type WebmentionProvider,
} from "./provider.js";
import { findTargetEntry } from "./targets.js";
import type { ResolvedWebmentionOptions } from "./types.js";

/** Public article summary attached to a fed mention. */
export type WebmentionFeedEntry = Readonly<{
  slug: string;
  permalink: string;
  title: string;
}>;

export type WebmentionFeedMention = WebmentionMention &
  Readonly<{ entry: WebmentionFeedEntry | null }>;

export type WebmentionFeed = Readonly<{
  version: "1";
  generatedAt: string;
  count: number;
  mentions: readonly WebmentionFeedMention[];
}>;

/**
 * Builds the `GET` feed handler. It returns verified mentions as JSON so an
 * application route, island, or external consumer can read them. The feed is
 * optional when the provider cannot query.
 */
export function createWebmentionFeedHandler(
  options: ResolvedWebmentionOptions,
  provider: WebmentionProvider,
): (context: PluginEndpointContext) => Promise<PluginEndpointResponse> {
  return async (context) => {
    if (!supportsWebmentionCapability(provider, "query")) {
      return errorResponse(501, "unsupported_query");
    }

    const target = context.request.query.target;
    const limit =
      parsePositiveInteger(context.request.query.limit) ?? options.limit;
    const since = context.request.query.since;

    let mentions: readonly WebmentionMention[];
    try {
      if (target !== undefined && target !== "") {
        const result = await provider.query({
          type: "mentions_for_target",
          target,
          limit,
        });
        mentions = result.mentions;
      } else {
        const result = await provider.query({
          type: "all_mentions",
          limit,
          since,
        });
        mentions = result.mentions;
      }
    } catch (error) {
      if (error instanceof UnsupportedWebmentionQueryError) {
        return errorResponse(501, "unsupported_query");
      }
      return errorResponse(503, "storage_unavailable");
    }

    return {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=60",
      },
      json: buildFeed(context.manifest, context.config, mentions),
    };
  };
}

/** Builds the feed payload shared by the endpoint and application consumers. */
export function buildFeed(
  manifest: ContentManifest,
  config: ResolvedRiebeckiteConfig | undefined,
  mentions: readonly WebmentionMention[],
): WebmentionFeed {
  return {
    version: "1",
    generatedAt: new Date().toISOString(),
    count: mentions.length,
    mentions: mentions.map((mention) => ({
      ...mention,
      entry: summarizeEntry(manifest, config, mention.target),
    })),
  };
}

export function summarizeEntry(
  manifest: ContentManifest,
  config: ResolvedRiebeckiteConfig | undefined,
  target: string,
): WebmentionFeedEntry | null {
  const entry = findTargetEntry(manifest, config, target);
  if (!entry) return null;
  return {
    slug: entry.slug,
    permalink: entry.permalink,
    title: entry.title,
  };
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000)
    return undefined;
  return parsed;
}
