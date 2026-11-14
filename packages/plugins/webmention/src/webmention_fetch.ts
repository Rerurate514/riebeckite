import { normalizeWebmentionUrl } from "./url.js";
import {
  isDisallowedHostname,
  isDisallowedIpAddress,
  isIpAddressLiteral,
  normalizeHostname,
} from "./webmention_hosts.js";
import type {
  WebmentionHostResolver,
  WebmentionSourceFetcher,
  WebmentionSourceFetcherOptions,
} from "./webmention_shared.js";
import {
  DEFAULT_WEBMENTION_MAX_BYTES,
  DEFAULT_WEBMENTION_TIMEOUT_MS,
  DEFAULT_WEBMENTION_USER_AGENT,
} from "./webmention_shared.js";

/**
 * Default fetcher backed by the global `fetch`. It follows redirects manually,
 * validating every hop's host and resolved addresses, and caps the response
 * body while it streams.
 */
export function createWebmentionSourceFetcher(
  options: WebmentionSourceFetcherOptions = {},
): WebmentionSourceFetcher {
  const timeoutMs = options.timeoutMs ?? DEFAULT_WEBMENTION_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_WEBMENTION_MAX_BYTES;
  const userAgent = options.userAgent ?? DEFAULT_WEBMENTION_USER_AGENT;
  const allowPrivateHosts = options.allowPrivateHosts ?? false;
  const resolveHostname = options.resolveHostname ?? defaultResolveHostname;
  return async (rawUrl) => {
    const url = normalizeWebmentionUrl(rawUrl);
    if (url === null) return null;
    if (typeof globalThis.fetch !== "function") return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let currentUrl = url;
      for (let redirects = 0; ; redirects += 1) {
        const decision: SourceUrlDecision = allowPrivateHosts
          ? { blocked: false }
          : await resolveSourceUrl(currentUrl, resolveHostname);
        if (decision.blocked) return null;
        const dispatcher = await createPinnedDispatcher(decision.pin);
        try {
          const response = await globalThis.fetch(currentUrl, {
            redirect: "manual",
            signal: controller.signal,
            headers: {
              accept: "text/html,application/xhtml+xml",
              "user-agent": userAgent,
            },
            ...(dispatcher === undefined ? {} : { dispatcher }),
          } as RequestInit);
          if (REDIRECT_STATUSES.has(response.status)) {
            const location = response.headers.get("location");
            await cancelBody(response);
            if (location === null || redirects >= MAX_REDIRECTS) return null;
            const next = resolveRedirectUrl(location, currentUrl);
            if (next === null) return null;
            currentUrl = next;
            continue;
          }
          if (!response.ok) {
            await cancelBody(response);
            return null;
          }
          const contentType = response.headers.get("content-type") ?? "";
          if (contentType !== "" && !isHtmlContentType(contentType)) {
            await cancelBody(response);
            return null;
          }
          const html = await readBodyWithinLimit(response, maxBytes);
          if (html === null) return null;
          return { url: response.url || currentUrl, html };
        } finally {
          await dispatcher?.close().catch(() => undefined);
        }
      }
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
}

const MAX_REDIRECTS = 10;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

class WebmentionDnsUnavailableError extends Error {}

const defaultResolveHostname: WebmentionHostResolver = async (hostname) => {
  const dns = await import("node:dns/promises").catch(() => null);
  if (dns === null) throw new WebmentionDnsUnavailableError();
  const records = await dns.lookup(hostname, { all: true });
  return records.map((record) => record.address);
};

type SourceAddress = Readonly<{ address: string; family: 4 | 6 }>;
type SourceUrlDecision = Readonly<{
  blocked: boolean;
  pin?: SourceAddress;
}>;

/**
 * Decides whether a source URL may be fetched and, when DNS was involved, the
 * address the connection must be pinned to.
 */
async function resolveSourceUrl(
  url: string,
  resolveHostname: WebmentionHostResolver,
): Promise<SourceUrlDecision> {
  const hostname = new URL(url).hostname;
  if (isDisallowedHostname(hostname)) return { blocked: true };

  const host = normalizeHostname(hostname);
  if (isIpAddressLiteral(host)) {
    return {
      blocked: false,
      pin: { address: host, family: host.includes(":") ? 6 : 4 },
    };
  }

  let addresses: readonly string[];
  try {
    addresses = await resolveHostname(host);
  } catch (error) {
    if (error instanceof WebmentionDnsUnavailableError) {
      return { blocked: false };
    }
    return { blocked: true };
  }
  if (addresses.length === 0) return { blocked: true };
  if (addresses.some((address) => isDisallowedIpAddress(address))) {
    return { blocked: true };
  }

  const address = addresses[0];
  if (address === undefined) return { blocked: true };
  return {
    blocked: false,
    pin: { address, family: address.includes(":") ? 6 : 4 },
  };
}

type PinnedDispatcher = Readonly<{ close(): Promise<void> }>;

async function createPinnedDispatcher(
  pin: SourceAddress | undefined,
): Promise<PinnedDispatcher | undefined> {
  if (pin === undefined) return undefined;
  try {
    const { Agent } = await import("undici");
    return new Agent({
      connect: {
        lookup: (_hostname, options, callback) => {
          if (options.all) {
            callback(null, [{ address: pin.address, family: pin.family }]);
            return;
          }
          callback(null, pin.address, pin.family);
        },
      },
    });
  } catch {
    return undefined;
  }
}

function resolveRedirectUrl(location: string, baseUrl: string): string | null {
  try {
    return normalizeWebmentionUrl(new URL(location, baseUrl).toString());
  } catch {
    return null;
  }
}

async function readBodyWithinLimit(
  response: Response,
  maxBytes: number,
): Promise<string | null> {
  const declared = response.headers.get("content-length");
  if (declared !== null) {
    const length = Number(declared);
    if (Number.isFinite(length) && length > maxBytes) return null;
  }

  const body = response.body;
  if (body === null) {
    const text = await response.text();
    return new TextEncoder().encode(text).byteLength > maxBytes ? null : text;
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value === undefined) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

async function cancelBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // Ignore a body that is absent or already disturbed.
  }
}

function isHtmlContentType(contentType: string): boolean {
  return /(?:text\/html|application\/xhtml\+xml)/i.test(contentType);
}
