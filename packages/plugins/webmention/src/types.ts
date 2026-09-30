import type { WebmentionProvider } from "./provider.js";
import type { WebmentionSourceFetcher } from "./verify.js";

/**
 * Options accepted by `webmention()`.
 *
 * `provider` is optional so a site can register the plugin before choosing a
 * runtime store. Without one the plugin falls back to an in-memory provider,
 * which is appropriate for local previews and tests but does not persist
 * across processes or isolates.
 */
export type WebmentionOptions = Readonly<{
  /** Verified-mention storage. Defaults to a per-plugin memory provider. */
  provider?: WebmentionProvider;
  /** Receive (POST) and feed (GET) path. Defaults to `/webmentions`. */
  endpoint?: string;
  /** Render stored mentions near articles. Defaults to `true`. */
  render?: boolean;
  /** Heading text for the rendered section. Defaults to `"Mentions"`. */
  headingText?: string;
  /** Maximum mentions rendered per article. Defaults to `20`. */
  limit?: number;
  /** Root CSS class of the rendered section. Defaults to `"rr-webmention"`. */
  className?: string;
  /** Extra absolute target URLs to accept beyond published entries. */
  allowedTargets?: readonly string[];
  /** Source fetcher override, mainly for tests and custom runtimes. */
  fetchSource?: WebmentionSourceFetcher;
  /** Fetch timeout in milliseconds. Defaults to `10000`. */
  timeoutMs?: number;
  /** Maximum accepted source document size in bytes. Defaults to `1000000`. */
  maxBytes?: number;
  /** Override the verification `User-Agent` header. */
  userAgent?: string;
  /** Allow fetching private-network sources. Defaults to `false`. */
  allowPrivateHosts?: boolean;
  /** Add `rel="nofollow ugc"` to rendered source links. Defaults to `true`. */
  nofollow?: boolean;
}>;

/** `WebmentionOptions` with every default applied. */
export type ResolvedWebmentionOptions = Readonly<{
  provider: WebmentionProvider;
  endpoint: string;
  render: boolean;
  headingText: string;
  limit: number;
  className: string;
  allowedTargets: readonly string[];
  fetchSource: WebmentionSourceFetcher;
  nofollow: boolean;
}>;
