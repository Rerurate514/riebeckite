import {
  type AnalyticsRateLimiter,
  type AnalyticsRateLimitOutcome,
  type AnalyticsRateLimitPolicy,
  assertRateLimitPolicy,
  rateLimitOutcome,
  rateLimitWindowStart,
} from "../../domain/analytics/rate_limit.js";

export type MemoryAnalyticsRateLimiterOptions = AnalyticsRateLimitPolicy &
  Readonly<{
    /** Clock injection for deterministic tests. Defaults to `Date.now`. */
    now?: () => number;
  }>;

/**
 * Process-local fixed-window limiter for tests and local development.
 *
 * In Cloudflare Workers this state lives in one isolate only: it is lost on cold
 * starts and is not shared across isolates or locations, so it is a best-effort
 * mitigation. Use `D1AnalyticsRateLimiter` for a shared, durable counter.
 */
export class MemoryAnalyticsRateLimiter implements AnalyticsRateLimiter {
  readonly #now: () => number;
  readonly #windows = new Map<string, { start: number; hits: number }>();

  constructor(private readonly options: MemoryAnalyticsRateLimiterOptions) {
    assertRateLimitPolicy(options);
    this.#now = options.now ?? Date.now;
  }

  async check(key: string): Promise<AnalyticsRateLimitOutcome> {
    const start = rateLimitWindowStart(this.#now(), this.options.windowMs);
    const current = this.#windows.get(key);
    const hits = current?.start === start ? current.hits + 1 : 1;
    this.#windows.set(key, { start, hits });
    return rateLimitOutcome(hits, this.options.maxRequests);
  }
}
