import assert from "node:assert/strict";
import { test } from "node:test";
import {
  D1AnalyticsRateLimiter,
  d1RateLimiter,
  MemoryAnalyticsRateLimiter,
} from "../index.js";

test("memory limiter allows the limit then resets on the next window", async () => {
  let now = 0;
  const limiter = new MemoryAnalyticsRateLimiter({
    maxRequests: 2,
    windowMs: 1_000,
    now: () => now,
  });

  assert.equal(await limiter.check("ip-a"), "allowed");
  assert.equal(await limiter.check("ip-a"), "allowed");
  assert.equal(await limiter.check("ip-a"), "limited");
  // Keys are independent.
  assert.equal(await limiter.check("ip-b"), "allowed");
  // The next window resets the counter.
  now = 1_000;
  assert.equal(await limiter.check("ip-a"), "allowed");
});

test("rate limiter rejects policies that would disable limiting", () => {
  assert.throws(
    () => new MemoryAnalyticsRateLimiter({ maxRequests: 0, windowMs: 1_000 }),
    RangeError,
  );
  assert.throws(
    () => new MemoryAnalyticsRateLimiter({ maxRequests: 1, windowMs: 0 }),
    RangeError,
  );
  assert.throws(
    () =>
      new D1AnalyticsRateLimiter(new FakeRateLimitD1(), {
        maxRequests: 1.5,
        windowMs: 1_000,
      }),
    RangeError,
  );
});

test("D1 limiter increments one shared counter and reports limiting", async () => {
  const database = new FakeRateLimitD1();
  let now = 5_000;
  const limiter = d1RateLimiter(database, {
    maxRequests: 2,
    windowMs: 1_000,
    now: () => now,
  });

  assert.equal(await limiter.check("ip-a"), "allowed");
  assert.equal(await limiter.check("ip-a"), "allowed");
  assert.equal(await limiter.check("ip-a"), "limited");
  assert.equal(await limiter.check("ip-b"), "allowed");
  now = 6_000;
  assert.equal(await limiter.check("ip-a"), "allowed");
});

class FakeRateLimitD1 {
  readonly hits = new Map<string, number>();

  prepare(): FakeRateLimitStatement {
    return new FakeRateLimitStatement(this);
  }
}

class FakeRateLimitStatement {
  #values: unknown[] = [];

  constructor(private readonly database: FakeRateLimitD1) {}

  bind(...values: unknown[]): FakeRateLimitStatement {
    this.#values = values;
    return this;
  }

  async run(): Promise<unknown> {
    return undefined;
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    const key = `${String(this.#values[0])}|${String(this.#values[1])}`;
    const hits = (this.database.hits.get(key) ?? 0) + 1;
    this.database.hits.set(key, hits);
    return { results: [{ hits } as T] };
  }
}
