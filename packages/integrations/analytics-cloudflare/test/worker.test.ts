import assert from "node:assert/strict";
import { test } from "node:test";
import type { AnalyticsEvent } from "@riebeckite/plugin-analytics";
import {
  createWorker,
  D1AnalyticsStorage,
  d1Storage,
  KvAnalyticsStorage,
  kvStorage,
  MemoryAnalyticsRateLimiter,
} from "../index.js";

test("worker validates events and exposes D1 read endpoints", async () => {
  const database = new FakeD1();
  const worker = createWorker({
    storage: new D1AnalyticsStorage(database),
    cors: { allowedOrigins: ["https://site.example"] },
  });
  const rejected = await worker.fetch(
    new Request("https://analytics.example/events", {
      method: "POST",
      headers: {
        Origin: "https://site.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "page_view",
        contentId: "bad\nid",
        occurredAt: "2026-01-01T00:00:00.000Z",
      }),
    }),
  );
  assert.equal(rejected.status, 400);

  const accepted = await worker.fetch(
    new Request("https://analytics.example/events", {
      method: "POST",
      headers: {
        Origin: "https://site.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "page_view",
        contentId: "guide-1",
        occurredAt: "2026-01-01T00:00:00.000Z",
        path: "/guide",
      }),
    }),
  );
  assert.equal(accepted.status, 204);
  const result = await worker.fetch(
    new Request("https://analytics.example/content/guide-1/page-views", {
      headers: { Origin: "https://site.example" },
    }),
  );
  assert.deepEqual(await result.json(), {
    type: "content_page_views",
    contentId: "guide-1",
    pageViews: 1,
  });
  assert.equal(
    result.headers.get("Access-Control-Allow-Origin"),
    "https://site.example",
  );
});

test("KV declares capture only and worker reports unsupported reads", async () => {
  const storage = new KvAnalyticsStorage(new FakeKv());
  assert.deepEqual([...storage.capabilities], ["capture"]);
  const worker = createWorker({ storage, cors: { allowedOrigins: "any" } });
  const response = await worker.fetch(
    new Request("https://analytics.example/popular", {
      headers: { Origin: "https://site.example" },
    }),
  );
  assert.equal(response.status, 501);
  assert.deepEqual(await response.json(), {
    error: "unsupported_query",
    message: "Analytics provider does not support popular_content queries.",
  });
});

test("storage factories construct the documented adapters", () => {
  assert.ok(d1Storage(new FakeD1()) instanceof D1AnalyticsStorage);
  assert.ok(kvStorage(new FakeKv()) instanceof KvAnalyticsStorage);
});

test("D1 content totals select whole UTC-day buckets from a time range", async () => {
  const database = new FakeD1();
  const storage = new D1AnalyticsStorage(database);
  await storage.capture(pageView("a", "2026-01-01T00:00:00.000Z"));
  await storage.capture(pageView("a", "2026-01-02T00:00:00.000Z"));
  await storage.capture(pageView("a", "2026-01-03T00:00:00.000Z"));

  assert.deepEqual(
    await storage.query({
      type: "content_page_views",
      contentId: "a",
      timeRange: { from: "2026-01-02T00:00:00.000Z" },
    }),
    { type: "content_page_views", contentId: "a", pageViews: 2 },
  );
  assert.deepEqual(
    await storage.query({
      type: "content_page_views",
      contentId: "a",
      timeRange: { to: "2026-01-02T00:00:00.000Z" },
    }),
    { type: "content_page_views", contentId: "a", pageViews: 2 },
  );
  assert.deepEqual(
    await storage.query({
      type: "content_page_views",
      contentId: "a",
      timeRange: {
        from: "2026-01-02T00:00:00.000Z",
        to: "2026-01-02T23:59:59.999Z",
      },
    }),
    { type: "content_page_views", contentId: "a", pageViews: 1 },
  );
  assert.deepEqual(
    await storage.query({ type: "content_page_views", contentId: "missing" }),
    { type: "content_page_views", contentId: "missing", pageViews: 0 },
  );
});

test("D1 popular ranking orders by page views and breaks ties by content ID", async () => {
  const database = new FakeD1();
  const storage = new D1AnalyticsStorage(database);
  for (const [contentId, day, count] of [
    ["a", "2026-01-01", 1],
    ["c", "2026-01-02", 3],
    ["b", "2026-01-03", 2],
  ] as const) {
    for (let i = 0; i < count; i++) {
      await storage.capture(pageView(contentId, `${day}T10:00:00.000Z`));
    }
  }

  assert.deepEqual(
    await storage.query({
      type: "popular_content",
      timeRange: { from: "2026-01-02T00:00:00.000Z" },
    }),
    {
      type: "popular_content",
      items: [
        { contentId: "c", pageViews: 3 },
        { contentId: "b", pageViews: 2 },
      ],
    },
  );
  const limited = (await storage.query({
    type: "popular_content",
    limit: 2,
  })) as { items: readonly { contentId: string }[] };
  assert.deepEqual(
    limited.items.map((item) => item.contentId),
    ["c", "b"],
  );
});

test("D1 capture ignores non-page-view events", async () => {
  const database = new FakeD1();
  const storage = new D1AnalyticsStorage(database);
  await storage.capture({
    type: "download",
    occurredAt: "2026-01-01T00:00:00.000Z",
  });
  await storage.capture(pageView("a", "2026-01-01T00:00:00.000Z"));
  assert.equal(database.counts.size, 1);
  assert.deepEqual(
    await storage.query({ type: "content_page_views", contentId: "a" }),
    { type: "content_page_views", contentId: "a", pageViews: 1 },
  );
});

test("KV capture accumulates best-effort totals and ignores other events", async () => {
  const fake = new FakeKv();
  const storage = new KvAnalyticsStorage(fake);
  await storage.capture(pageView("a", "2026-01-01T00:00:00.000Z"));
  await storage.capture(pageView("a", "2026-01-02T00:00:00.000Z"));
  await storage.capture({
    type: "download",
    occurredAt: "2026-01-03T00:00:00.000Z",
  });
  assert.equal(await fake.get("analytics:page-view:a"), "2");
});

test("worker enforces deny-by-default origin access", async () => {
  const database = new FakeD1();
  const worker = createWorker({
    storage: new D1AnalyticsStorage(database),
    cors: { allowedOrigins: ["https://site.example"] },
  });

  const noOrigin = await worker.fetch(
    new Request("https://analytics.example/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pageView("a", "2026-01-01T00:00:00.000Z")),
    }),
  );
  assert.equal(noOrigin.status, 403);
  assert.deepEqual(await noOrigin.json(), { error: "origin_required" });

  const wrongOrigin = await worker.fetch(
    new Request("https://analytics.example/events", {
      method: "POST",
      headers: {
        Origin: "https://other.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pageView("a", "2026-01-01T00:00:00.000Z")),
    }),
  );
  assert.equal(wrongOrigin.status, 403);
  assert.deepEqual(await wrongOrigin.json(), { error: "origin_not_allowed" });

  const preflight = await worker.fetch(
    new Request("https://analytics.example/events", {
      method: "OPTIONS",
      headers: {
        Origin: "https://site.example",
        "Access-Control-Request-Method": "POST",
      },
    }),
  );
  assert.equal(preflight.status, 204);
  assert.equal(
    preflight.headers.get("Access-Control-Allow-Origin"),
    "https://site.example",
  );
});

test("worker allows missing origins and public collectors when configured", async () => {
  const storage = new D1AnalyticsStorage(new FakeD1());
  const permissive = createWorker({
    storage,
    cors: { allowedOrigins: "any", allowMissingOrigin: true },
  });
  const noOrigin = await permissive.fetch(
    new Request("https://analytics.example/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pageView("a", "2026-01-01T00:00:00.000Z")),
    }),
  );
  assert.equal(noOrigin.status, 204);

  const withOrigin = await permissive.fetch(
    new Request("https://analytics.example/events", {
      method: "POST",
      headers: {
        Origin: "https://any.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pageView("a", "2026-01-01T00:00:00.000Z")),
    }),
  );
  assert.equal(withOrigin.status, 204);
  assert.equal(withOrigin.headers.get("Access-Control-Allow-Origin"), "*");
});

test("worker rejects malformed event payloads", async () => {
  const database = new FakeD1();
  const worker = createWorker({
    storage: new D1AnalyticsStorage(database),
    cors: { allowedOrigins: "any", allowMissingOrigin: true },
  });
  const wrongMediaType = await worker.fetch(
    new Request("https://analytics.example/events", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "hello",
    }),
  );
  assert.equal(wrongMediaType.status, 415);
  assert.deepEqual(await wrongMediaType.json(), {
    error: "unsupported_media_type",
  });

  const invalidJson = await postEvent(worker, "{ not json");
  assert.equal(invalidJson.status, 400);
  assert.deepEqual(await invalidJson.json(), { error: "invalid_json" });

  const payloads: Array<[unknown, string]> = [
    [{}, "invalid_event"],
    [
      { type: "download", occurredAt: "2026-01-01T00:00:00.000Z" },
      "invalid_event",
    ],
    [{ type: "page_view", contentId: "guide-1" }, "invalid_event"],
    [
      { type: "page_view", contentId: "guide-1", occurredAt: "yesterday" },
      "invalid_event",
    ],
    [
      {
        type: "page_view",
        contentId: "guide-1",
        occurredAt: "2026-01-01T00:00:00.000Z",
        path: "guide",
      },
      "invalid_event",
    ],
    [
      {
        type: "page_view",
        contentId: " guide-1",
        occurredAt: "2026-01-01T00:00:00.000Z",
      },
      "invalid_event",
    ],
    [
      {
        type: "page_view",
        contentId: "guide-1",
        occurredAt: "2026-01-01T00:00:00.000Z",
        unknownField: true,
      },
      "invalid_event",
    ],
  ];

  for (const [payload, error] of payloads) {
    const response = await postEvent(worker, JSON.stringify(payload));
    assert.equal(
      response.status,
      400,
      `expected 400 for ${JSON.stringify(payload)}`,
    );
    assert.deepEqual(await response.json(), { error });
  }
});

async function postEvent(
  worker: ReturnType<typeof createWorker>,
  body: string,
) {
  return await worker.fetch(
    new Request("https://analytics.example/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }),
  );
}

test("worker enforces the 8 KiB payload limit by length and by bytes", async () => {
  const database = new FakeD1();
  const worker = createWorker({
    storage: new D1AnalyticsStorage(database),
    cors: { allowedOrigins: "any", allowMissingOrigin: true },
  });
  const oversized = new Request("https://analytics.example/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: `{"type":${JSON.stringify("page_view".repeat(2000))}}`,
  });

  const byHeader = await worker.fetch(
    new Request("https://analytics.example/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "9000",
      },
      body: JSON.stringify(pageView("a", "2026-01-01T00:00:00.000Z")),
    }),
  );
  assert.equal(byHeader.status, 413);
  const byBytes = await worker.fetch(oversized);
  assert.equal(byBytes.status, 413);
  assert.deepEqual(await byBytes.json(), { error: "payload_too_large" });
});

test("worker rate limits capture per client IP and returns 429", async () => {
  const database = new FakeD1();
  let now = 0;
  const worker = createWorker({
    storage: new D1AnalyticsStorage(database),
    cors: { allowedOrigins: "any", allowMissingOrigin: true },
    rateLimit: new MemoryAnalyticsRateLimiter({
      maxRequests: 2,
      windowMs: 60_000,
      now: () => now,
    }),
  });
  const post = (ip: string) =>
    worker.fetch(
      new Request("https://analytics.example/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": ip,
        },
        body: JSON.stringify(pageView("a", "2026-01-01T00:00:00.000Z")),
      }),
    );

  assert.equal((await post("198.51.100.1")).status, 204);
  assert.equal((await post("198.51.100.1")).status, 204);
  const limited = await post("198.51.100.1");
  assert.equal(limited.status, 429);
  assert.deepEqual(await limited.json(), { error: "rate_limited" });
  // The limit is per client, not global.
  assert.equal((await post("198.51.100.2")).status, 204);
  // The next window admits the original client again.
  now = 60_000;
  assert.equal((await post("198.51.100.1")).status, 204);
});

test("worker validates query parameters for read endpoints", async () => {
  const database = new FakeD1();
  const worker = createWorker({
    storage: new D1AnalyticsStorage(database),
    cors: { allowedOrigins: "any", allowMissingOrigin: true },
  });
  const queries: Array<[string, string]> = [
    [
      "https://analytics.example/content/a/page-views?from=not-a-date",
      "invalid_time_range",
    ],
    [
      "https://analytics.example/content/a/page-views?from=2026-02-01T00:00:00.000Z&to=2026-01-01T00:00:00.000Z",
      "invalid_time_range",
    ],
    [
      "https://analytics.example/content/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/page-views",
      "invalid_content_id",
    ],
    ["https://analytics.example/popular?limit=0", "invalid_query"],
    ["https://analytics.example/popular?limit=101", "invalid_query"],
    ["https://analytics.example/popular?limit=2.5", "invalid_query"],
    [
      "https://analytics.example/popular?from=2026-02-01T00:00:00.000Z&to=2026-01-01T00:00:00.000Z",
      "invalid_query",
    ],
  ];

  for (const [url, error] of queries) {
    const response = await worker.fetch(new Request(url));
    assert.equal(response.status, 400, `expected 400 for ${url}`);
    assert.deepEqual(await response.json(), { error });
  }
});

test("worker returns 404 for unknown routes and 503 for storage failures", async () => {
  const database = new FakeD1();
  const worker = createWorker({
    storage: new D1AnalyticsStorage(database),
    cors: { allowedOrigins: "any", allowMissingOrigin: true },
  });
  const notFound = await worker.fetch(
    new Request("https://analytics.example/unknown"),
  );
  assert.equal(notFound.status, 404);

  database.failNextQuery = true;
  const failed = await worker.fetch(
    new Request("https://analytics.example/content/a/page-views"),
  );
  assert.equal(failed.status, 503);
  assert.deepEqual(await failed.json(), { error: "storage_unavailable" });
});

function pageView(contentId: string, occurredAt: string): AnalyticsEvent {
  return { type: "page_view", contentId, occurredAt };
}

class FakeD1 {
  readonly counts = new Map<string, number>();
  failNextQuery = false;

  prepare(query: string) {
    return new FakeStatement(query, this);
  }
}

class FakeStatement {
  #values: unknown[] = [];

  constructor(
    private readonly query: string,
    private readonly database: FakeD1,
  ) {}

  bind(...values: unknown[]) {
    this.#values = values;
    return this;
  }

  async run() {
    const contentId = String(this.#values[0]);
    const bucketStart = String(this.#values[1]);
    const key = `${contentId}|${bucketStart}`;
    this.database.counts.set(key, (this.database.counts.get(key) ?? 0) + 1);
  }

  async all<T = unknown>() {
    if (this.database.failNextQuery) throw new Error("storage exploded");
    if (this.query.includes("GROUP BY content_id")) {
      return { results: this.popularRows() as T[] };
    }
    return { results: [{ page_views: this.contentTotal() }] as T[] };
  }

  private boundRangeValues(startIndex: number): Array<string | undefined> {
    const clauses = [
      this.query.includes("bucket_start >= ?"),
      this.query.includes("bucket_start <= ?"),
    ];
    const values: Array<string | undefined> = [];
    let index = 0;
    for (const present of clauses) {
      values.push(
        present ? String(this.#values[startIndex + index++]) : undefined,
      );
    }
    return values;
  }

  private contentTotal() {
    const contentId = String(this.#values[0]);
    const [from, to] = this.boundRangeValues(1);
    let total = 0;
    for (const [key, count] of this.database.counts) {
      const [id, bucketStart] = key.split("|");
      if (id !== contentId) continue;
      if (from !== undefined && bucketStart < from) continue;
      if (to !== undefined && bucketStart > to) continue;
      total += count;
    }
    return total;
  }

  private popularRows(): Array<{ content_id: string; page_views: number }> {
    const [from, to] = this.boundRangeValues(0);
    const literalLimit = Number(this.#values.at(-1));
    const totals = new Map<string, number>();
    for (const [key, count] of this.database.counts) {
      const [contentId, bucketStart] = key.split("|");
      if (from !== undefined && bucketStart < from) continue;
      if (to !== undefined && bucketStart > to) continue;
      totals.set(contentId, (totals.get(contentId) ?? 0) + count);
    }
    return [...totals.entries()]
      .map(([content_id, page_views]) => ({ content_id, page_views }))
      .sort(
        (left, right) =>
          right.page_views - left.page_views ||
          left.content_id.localeCompare(right.content_id),
      )
      .slice(0, literalLimit);
  }
}

class FakeKv {
  readonly values = new Map<string, string>();
  async get(key: string) {
    return this.values.get(key) ?? null;
  }
  async put(key: string, value: string) {
    this.values.set(key, value);
  }
}
