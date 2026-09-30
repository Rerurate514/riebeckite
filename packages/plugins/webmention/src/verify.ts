import type { WebmentionMention } from "./mention.js";
import {
  findTargetLink,
  parseWebmentionSource,
  webmentionTypeForRels,
} from "./parse.js";
import { normalizeWebmentionUrl } from "./url.js";

export type WebmentionSourceDocument = Readonly<{
  /** Final absolute URL of the fetched document. */
  url: string;
  html: string;
}>;

/**
 * Fetches a source document. It returns `null` for an unreachable, non-HTML,
 * oversized, or otherwise unusable source. Implementations keep their own
 * network/runtime details; the plugin core only calls this function.
 */
export type WebmentionSourceFetcher = (
  url: string,
) => Promise<WebmentionSourceDocument | null>;

export type WebmentionSourceFetcherOptions = Readonly<{
  /** Request timeout in milliseconds. Defaults to `10000`. */
  timeoutMs?: number;
  /** Maximum accepted body size in bytes. Defaults to `1_000_000`. */
  maxBytes?: number;
  userAgent?: string;
  /**
   * Allow fetching loopback and private-network hosts. Defaults to `false`.
   * Enable only for a trusted, self-hosted verification service.
   */
  allowPrivateHosts?: boolean;
}>;

export const DEFAULT_WEBMENTION_TIMEOUT_MS = 10_000;
export const DEFAULT_WEBMENTION_MAX_BYTES = 1_000_000;
export const DEFAULT_WEBMENTION_USER_AGENT =
  "Riebeckite-Webmention/1.0 (+https://github.com/Rerurate514/riebeckite)";

/**
 * Default fetcher backed by the global `fetch`. It blocks loopback and
 * private-network hosts, caps the response size, and follows redirects.
 */
export function createWebmentionSourceFetcher(
  options: WebmentionSourceFetcherOptions = {},
): WebmentionSourceFetcher {
  const timeoutMs = options.timeoutMs ?? DEFAULT_WEBMENTION_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_WEBMENTION_MAX_BYTES;
  const userAgent = options.userAgent ?? DEFAULT_WEBMENTION_USER_AGENT;
  const allowPrivateHosts = options.allowPrivateHosts ?? false;

  return async (rawUrl) => {
    const url = normalizeWebmentionUrl(rawUrl);
    if (url === null) return null;
    if (!allowPrivateHosts && isDisallowedHost(new URL(url).hostname)) {
      return null;
    }
    if (typeof globalThis.fetch !== "function") return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await globalThis.fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": userAgent,
        },
      });
      if (!response.ok) return null;
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType !== "" && !isHtmlContentType(contentType)) return null;
      const html = await response.text();
      if (new TextEncoder().encode(html).byteLength > maxBytes) return null;
      return { url: response.url || url, html };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
}

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

function isHtmlContentType(contentType: string): boolean {
  return /(?:text\/html|application\/xhtml\+xml)/i.test(contentType);
}

function isDisallowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host === "0.0.0.0" || host === "::") return true;
  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  if (/^fe80:/i.test(host) || /^f[cd][0-9a-f]{2}:/i.test(host)) return true;
  return false;
}
