import type { AnalyticsEvent } from "./event.js";
import type { AnalyticsQuery, AnalyticsResult } from "./query.js";

export const ANALYTICS_CAPABILITIES = [
  "capture",
  "content_page_views",
  "popular_content",
] as const;

export type AnalyticsCapability = (typeof ANALYTICS_CAPABILITIES)[number];

/**
 * Storage- and runtime-independent analytics boundary.
 *
 * Implementations may keep private credentials or runtime bindings internally.
 * Only an explicit `AnalyticsPublicConfig` is ever passed to browser code.
 */
export interface AnalyticsProvider {
  readonly capabilities: ReadonlySet<AnalyticsCapability>;
  capture(event: AnalyticsEvent): Promise<void>;
  query(query: AnalyticsQuery): Promise<AnalyticsResult>;
}

export function supportsAnalyticsCapability(
  provider: AnalyticsProvider,
  capability: AnalyticsCapability,
): boolean {
  return provider.capabilities.has(capability);
}

export class UnsupportedAnalyticsQueryError extends Error {
  readonly name = "UnsupportedAnalyticsQueryError";

  constructor(
    readonly query: AnalyticsQuery,
    readonly requiredCapability: AnalyticsCapability,
  ) {
    super(`Analytics provider does not support ${requiredCapability} queries.`);
  }
}

export function requiredCapabilityForQuery(
  query: AnalyticsQuery,
): AnalyticsCapability {
  return query.type;
}

export function assertAnalyticsQuerySupported(
  provider: AnalyticsProvider,
  query: AnalyticsQuery,
): void {
  const capability = requiredCapabilityForQuery(query);
  if (!supportsAnalyticsCapability(provider, capability)) {
    throw new UnsupportedAnalyticsQueryError(query, capability);
  }
}
