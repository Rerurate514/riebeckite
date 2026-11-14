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

/**
 * Resolves a hostname to every IP address it currently points at. It is
 * injectable so a runtime (or a test) can supply its own resolver. The default
 * uses `node:dns` and falls back to no resolution when the builtin is
 * unavailable, such as in a Worker without a DNS module.
 */
export type WebmentionHostResolver = (
  hostname: string,
) => Promise<readonly string[]>;

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
  /**
   * Hostname resolver used for DNS-rebinding checks. Defaults to the runtime's
   * `node:dns` resolver. When resolution is unavailable, the hostname string
   * and literal-IP checks still apply.
   */
  resolveHostname?: WebmentionHostResolver;
}>;

export const DEFAULT_WEBMENTION_TIMEOUT_MS = 10_000;
export const DEFAULT_WEBMENTION_MAX_BYTES = 1_000_000;
export const DEFAULT_WEBMENTION_USER_AGENT =
  "Riebeckite-Webmention/1.0 (+https://github.com/Rerurate514/riebeckite)";
