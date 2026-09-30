/**
 * Runtime-owned rate-limit boundary for the analytics collector.
 *
 * Origin checks are not authentication, so a client can forge an allowed
 * `Origin` and POST fabricated events. Rate limiting reduces that abuse from a
 * single client key; it is a mitigation, not complete prevention, and never
 * makes collected analytics authorization data.
 */
export type AnalyticsRateLimitOutcome = "allowed" | "limited";

export interface AnalyticsRateLimiter {
  /** Records one attempt for `key` and reports whether it may proceed. */
  check(key: string): Promise<AnalyticsRateLimitOutcome>;
}

export interface AnalyticsRateLimitPolicy {
  /** Maximum accepted attempts per key inside one window. */
  readonly maxRequests: number;
  /** Window length in milliseconds. */
  readonly windowMs: number;
}

/** Rejects policies that would silently disable limiting (zero or non-integer). */
export function assertRateLimitPolicy(policy: AnalyticsRateLimitPolicy): void {
  if (!Number.isInteger(policy.maxRequests) || policy.maxRequests < 1)
    throw new RangeError("rate limit maxRequests must be a positive integer");
  if (!Number.isInteger(policy.windowMs) || policy.windowMs < 1)
    throw new RangeError("rate limit windowMs must be a positive integer");
}

/** Fixed-window bucket start for `now` in epoch milliseconds. */
export function rateLimitWindowStart(now: number, windowMs: number): number {
  return Math.floor(now / windowMs) * windowMs;
}

/** Maps the hit count inside the current window to an outcome. */
export function rateLimitOutcome(
  hits: number,
  maxRequests: number,
): AnalyticsRateLimitOutcome {
  return hits <= maxRequests ? "allowed" : "limited";
}
