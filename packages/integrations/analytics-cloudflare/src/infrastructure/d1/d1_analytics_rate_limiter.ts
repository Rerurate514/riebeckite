import {
  type AnalyticsRateLimiter,
  type AnalyticsRateLimitOutcome,
  type AnalyticsRateLimitPolicy,
  assertRateLimitPolicy,
  rateLimitOutcome,
  rateLimitWindowStart,
} from "../../domain/analytics/rate_limit.js";
import type { D1Database } from "./d1_types.js";

type HitsRow = Readonly<{ hits: number | string | null }>;

export type D1AnalyticsRateLimiterOptions = AnalyticsRateLimitPolicy &
  Readonly<{
    /** Clock injection for deterministic tests. Defaults to `Date.now`. */
    now?: () => number;
  }>;

/**
 * D1-backed fixed-window limiter shared across Worker isolates.
 *
 * The connecting IP is stored as the bucket key for the active window only.
 * Expired rows are never read again, but D1 has no TTL; prune old rows
 * periodically (for example from a scheduled Worker) if retention matters.
 */
export class D1AnalyticsRateLimiter implements AnalyticsRateLimiter {
  readonly #now: () => number;

  constructor(
    private readonly database: D1Database,
    private readonly options: D1AnalyticsRateLimiterOptions,
  ) {
    assertRateLimitPolicy(options);
    this.#now = options.now ?? Date.now;
  }

  async check(key: string): Promise<AnalyticsRateLimitOutcome> {
    const windowStart = rateLimitWindowStart(
      this.#now(),
      this.options.windowMs,
    );
    const result = await this.database
      .prepare(
        `INSERT INTO analytics_rate_limits (bucket_key, window_start, hits)
         VALUES (?, ?, 1)
         ON CONFLICT(bucket_key, window_start)
         DO UPDATE SET hits = hits + 1
         RETURNING hits`,
      )
      .bind(key, windowStart)
      .all<HitsRow>();
    return rateLimitOutcome(
      Number(result.results?.[0]?.hits ?? 0),
      this.options.maxRequests,
    );
  }
}

/** Creates a D1-backed analytics rate limiter from a Worker binding. */
export function d1RateLimiter(
  database: D1Database,
  options: D1AnalyticsRateLimiterOptions,
): AnalyticsRateLimiter {
  return new D1AnalyticsRateLimiter(database, options);
}
