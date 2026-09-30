import type { WebmentionMention } from "./mention.js";
import type { WebmentionQuery, WebmentionQueryResult } from "./query.js";

export const WEBMENTION_CAPABILITIES = ["store", "query"] as const;

export type WebmentionCapability = (typeof WEBMENTION_CAPABILITIES)[number];

/**
 * Storage- and runtime-independent Webmention boundary.
 *
 * The plugin only ever sees this interface. A provider may keep credentials,
 * database handles, or runtime bindings internally; those never enter the
 * plugin options that reach generated output.
 */
export interface WebmentionProvider {
  readonly capabilities: ReadonlySet<WebmentionCapability>;
  /**
   * Persists a verified mention. Implementations upsert by `(source, target)`
   * so repeated deliveries converge on one record.
   */
  store(mention: WebmentionMention): Promise<void>;
  /** Reads stored mentions. */
  query(query: WebmentionQuery): Promise<WebmentionQueryResult>;
}

export function supportsWebmentionCapability(
  provider: WebmentionProvider,
  capability: WebmentionCapability,
): boolean {
  return provider.capabilities.has(capability);
}

export class UnsupportedWebmentionQueryError extends Error {
  readonly name = "UnsupportedWebmentionQueryError";

  constructor(
    readonly query: WebmentionQuery,
    readonly requiredCapability: WebmentionCapability,
  ) {
    super(
      `Webmention provider does not support ${requiredCapability} operations.`,
    );
  }
}

export function requiredCapabilityForQuery(
  _query: WebmentionQuery,
): WebmentionCapability {
  return "query";
}

export function assertWebmentionQuerySupported(
  provider: WebmentionProvider,
  query: WebmentionQuery,
): void {
  const capability = requiredCapabilityForQuery(query);
  if (!supportsWebmentionCapability(provider, capability)) {
    throw new UnsupportedWebmentionQueryError(query, capability);
  }
}
