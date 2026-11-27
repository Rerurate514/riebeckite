import {
  assertRateLimitPolicy,
  rateLimitOutcome,
  rateLimitWindowStart,
  type WebmentionRateLimiter,
  type WebmentionRateLimitOutcome,
  type WebmentionRateLimitPolicy,
} from "../../domain/webmention/rate_limit.js";
import type { D1Database } from "./d1_types.js";

type HitsRow = Readonly<{ hits: number | string | null }>;

export type D1WebmentionRateLimiterOptions = WebmentionRateLimitPolicy &
  Readonly<{
    now?: () => number;
  }>;

export class D1WebmentionRateLimiter implements WebmentionRateLimiter {
  readonly #now: () => number;

  constructor(
    private readonly database: D1Database,
    private readonly options: D1WebmentionRateLimiterOptions,
  ) {
    assertRateLimitPolicy(options);
    this.#now = options.now ?? Date.now;
  }

  async check(key: string): Promise<WebmentionRateLimitOutcome> {
    const windowStart = rateLimitWindowStart(
      this.#now(),
      this.options.windowMs,
    );
    const result = await this.database
      .prepare(
        `INSERT INTO webmention_rate_limits (bucket_key, window_start, hits)
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

export function d1RateLimiter(
  database: D1Database,
  options: D1WebmentionRateLimiterOptions,
): WebmentionRateLimiter {
  return new D1WebmentionRateLimiter(database, options);
}
