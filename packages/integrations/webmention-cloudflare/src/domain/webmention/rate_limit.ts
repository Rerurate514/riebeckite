export type WebmentionRateLimitOutcome = "allowed" | "limited";

export interface WebmentionRateLimiter {
  check(key: string): Promise<WebmentionRateLimitOutcome>;
}

export interface WebmentionRateLimitPolicy {
  readonly maxRequests: number;
  readonly windowMs: number;
}

export function assertRateLimitPolicy(policy: WebmentionRateLimitPolicy): void {
  if (!Number.isInteger(policy.maxRequests) || policy.maxRequests < 1)
    throw new RangeError("rate limit maxRequests must be a positive integer");
  if (!Number.isInteger(policy.windowMs) || policy.windowMs < 1)
    throw new RangeError("rate limit windowMs must be a positive integer");
}

export function rateLimitWindowStart(now: number, windowMs: number): number {
  return Math.floor(now / windowMs) * windowMs;
}

export function rateLimitOutcome(
  hits: number,
  maxRequests: number,
): WebmentionRateLimitOutcome {
  return hits <= maxRequests ? "allowed" : "limited";
}
