import assert from "node:assert/strict";
import { test } from "node:test";
import {
  UnsupportedWebmentionQueryError,
  urlComparisonKey,
  type WebmentionMention,
} from "@riebeckite/plugin-webmention";
import {
  createWorker,
  D1WebmentionStorage,
  d1Storage,
  KvWebmentionStorage,
  kvStorage,
} from "../index.js";

const SOURCE = "https://source.example/entry";
const TARGET = "https://target.example/post";
const SOURCE_HTML = `<html><body><a href="${TARGET}/">link</a></body></html>`;

function makeMention(
  overrides: Partial<WebmentionMention> = {},
): WebmentionMention {
  return {
    source: SOURCE,
    target: TARGET,
    type: "mention",
    verifiedAt: "2026-02-01T00:00:00.000Z",
    title: "A note",
    ...overrides,
  };
}

function memoryStorage() {
  const mentions = new Map<string, WebmentionMention>();
  return {
    capabilities: new Set(["store", "query"] as const),
    async store(mention: WebmentionMention) {
      mentions.set(`${mention.source}\n${mention.target}`, mention);
    },
    async query(query: { type: string; target?: string }) {
      const list = [...mentions.values()].filter(
        (mention) =>
          query.target === undefined ||
          urlComparisonKey(mention.target) === urlComparisonKey(query.target),
      );
      return query.type === "mentions_for_target"
        ? {
            type: "mentions_for_target" as const,
            target: query.target ?? "",
            mentions: list,
          }
        : { type: "all_mentions" as const, mentions: list };
    },
  };
}

test("D1 storage upserts canonical targets and maps rows", async () => {
  const runs: { sql: string; values: readonly unknown[] }[] = [];
  let rows: unknown[] = [];
  const database = {
    prepare(sql: string) {
      let values: readonly unknown[] = [];
      const statement = {
        bind(...bound: readonly unknown[]) {
          values = bound;
          return statement;
        },
        async all<T = unknown>() {
          return { results: rows as T[] };
        },
        async run() {
          runs.push({ sql, values });
          return {};
        },
      };
      return statement;
    },
  };
  const storage = new D1WebmentionStorage(database);
  await storage.store(makeMention({ target: `${TARGET}/` }));
  assert.equal(runs.length, 1);
  assert.equal(runs[0]?.values[1], urlComparisonKey(TARGET));
  assert.equal(storage.capabilities.has("query"), true);

  rows = [
    {
      source: SOURCE,
      target: urlComparisonKey(TARGET),
      type: "like",
      verified_at: "2026-02-01T00:00:00.000Z",
      published_at: null,
      title: null,
      excerpt: null,
      author_name: "Ada",
      author_url: null,
      author_photo: null,
    },
  ];
  const result = await storage.query({
    type: "mentions_for_target",
    target: TARGET,
  });
  assert.equal(result.type, "mentions_for_target");
  if (result.type === "mentions_for_target") {
    assert.equal(result.mentions[0]?.type, "like");
    assert.equal(result.mentions[0]?.author?.name, "Ada");
  }
  assert.equal(d1Storage(database).capabilities.has("store"), true);
});

test("KV storage is store-only and rejects reads", async () => {
  const values = new Map<string, string>();
  const namespace = {
    async get(key: string) {
      return values.get(key) ?? null;
    },
    async put(key: string, value: string) {
      values.set(key, value);
    },
  };
  const storage = new KvWebmentionStorage(namespace);
  await storage.store(makeMention());
  assert.equal(values.size, 1);
  await assert.rejects(
    storage.query({ type: "all_mentions" }),
    UnsupportedWebmentionQueryError,
  );
  assert.equal(kvStorage(namespace).capabilities.has("query"), false);
});

test("worker receives a verified mention and serves the feed", async () => {
  const storage = memoryStorage();
  const worker = createWorker({
    storage,
    allowedTargets: [TARGET],
    fetchSource: async (url) =>
      url === SOURCE ? { url, html: SOURCE_HTML } : null,
  });

  const body = new URLSearchParams({ source: SOURCE, target: `${TARGET}/` });
  const received = await worker.fetch(
    new Request("https://target.example/webmentions", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    }),
  );
  assert.equal(received.status, 202);

  const feed = await worker.fetch(
    new Request(
      `https://target.example/webmentions?target=${encodeURIComponent(TARGET)}`,
    ),
  );
  assert.equal(feed.status, 200);
  const payload = (await feed.json()) as { count: number };
  assert.equal(payload.count, 1);
});

test("worker rejects unknown targets and unlinked sources", async () => {
  const storage = memoryStorage();
  const worker = createWorker({
    storage,
    allowedTargets: [TARGET],
    fetchSource: async (url) => ({ url, html: "<p>no links</p>" }),
  });

  const unknown = await worker.fetch(
    new Request("https://target.example/webmentions", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        source: SOURCE,
        target: "https://target.example/other",
      }),
    }),
  );
  assert.equal(unknown.status, 400);

  const unlinked = await worker.fetch(
    new Request("https://target.example/webmentions", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ source: SOURCE, target: TARGET }),
    }),
  );
  assert.equal(unlinked.status, 400);
  assert.deepEqual(await unlinked.json(), { error: "no_link_found" });
});

test("worker returns 501 for a capture-only storage feed", async () => {
  const worker = createWorker({
    storage: kvStorage({
      async get() {
        return null;
      },
      async put() {},
    }),
    allowedTargets: [TARGET],
  });
  const response = await worker.fetch(
    new Request("https://target.example/webmentions"),
  );
  assert.equal(response.status, 501);
});
