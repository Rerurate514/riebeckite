import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createWorker,
  D1AnalyticsStorage,
  KvAnalyticsStorage,
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

class FakeD1 {
  readonly counts = new Map<string, number>();

  prepare(query: string) {
    return new FakeStatement(query, this.counts);
  }
}

class FakeStatement {
  #values: unknown[] = [];

  constructor(
    private readonly query: string,
    private readonly counts: Map<string, number>,
  ) {}

  bind(...values: unknown[]) {
    this.#values = values;
    return this;
  }
  async run() {
    const contentId = String(this.#values[0]);
    const day = String(this.#values[1]);
    const key = `${contentId}:${day}`;
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
  }
  async all() {
    if (this.query.includes("WHERE content_id")) {
      const contentId = String(this.#values[0]);
      const pageViews = [...this.counts]
        .filter(([key]) => key.startsWith(`${contentId}:`))
        .reduce((total, [, count]) => total + count, 0);
      return { results: [{ page_views: pageViews }] };
    }
    return { results: [] };
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
