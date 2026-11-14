import type { WebmentionSourceFetcher } from "./webmention_shared.js";

export type {
  WebmentionHostResolver,
  WebmentionSourceDocument,
  WebmentionSourceFetcher,
  WebmentionSourceFetcherOptions,
} from "./webmention_shared.js";
export {
  DEFAULT_WEBMENTION_MAX_BYTES,
  DEFAULT_WEBMENTION_TIMEOUT_MS,
  DEFAULT_WEBMENTION_USER_AGENT,
} from "./webmention_shared.js";

import type { WebmentionMention } from "./mention.js";
import {
  findTargetLink,
  parseWebmentionSource,
  webmentionTypeForRels,
} from "./parse.js";
import { normalizeWebmentionUrl } from "./url.js";

/** Redirect hops allowed before a source is treated as unreachable. */
const _MAX_REDIRECTS = 10;

const _REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export type WebmentionRejectionReason =
  | "invalid_source"
  | "invalid_target"
  | "source_unreachable"
  | "no_link_found";

export type WebmentionVerification =
  | Readonly<{ ok: true; mention: WebmentionMention }>
  | Readonly<{ ok: false; reason: WebmentionRejectionReason }>;

/**
 * Verifies that `source` actually links to `target` and, when it does, builds
 * the verified mention record. Network access happens only through `fetchSource`.
 */
export async function verifyWebmention(input: {
  source: string;
  target: string;
  fetchSource: WebmentionSourceFetcher;
  verifiedAt?: string;
}): Promise<WebmentionVerification> {
  const source = normalizeWebmentionUrl(input.source);
  const target = normalizeWebmentionUrl(input.target);
  if (source === null) return { ok: false, reason: "invalid_source" };
  if (target === null) return { ok: false, reason: "invalid_target" };

  const document = await input.fetchSource(source);
  if (document === null) return { ok: false, reason: "source_unreachable" };

  const parsed = parseWebmentionSource(document.html, source);
  const link = findTargetLink(parsed, target);
  if (link === null) return { ok: false, reason: "no_link_found" };

  return {
    ok: true,
    mention: {
      source,
      target,
      type: webmentionTypeForRels(link.rels),
      verifiedAt: input.verifiedAt ?? new Date().toISOString(),
      ...(parsed.publishedAt === undefined
        ? {}
        : { publishedAt: parsed.publishedAt }),
      ...(parsed.title === undefined ? {} : { title: parsed.title }),
      ...(parsed.excerpt === undefined ? {} : { excerpt: parsed.excerpt }),
      ...(parsed.author === undefined ? {} : { author: parsed.author }),
    },
  };
}

export { createWebmentionSourceFetcher } from "./webmention_fetch.js";
export {
  isDisallowedHostname,
  isDisallowedIpAddress,
} from "./webmention_hosts.js";
