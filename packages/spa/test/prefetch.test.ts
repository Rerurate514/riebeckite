import assert from "node:assert/strict";
import test from "node:test";
import { PageCache, type PageFetcher } from "../prefetch.js";

const ttlMs = 1000;
const page = (url: string) => ({
  html: `<main id="main-content">${url}</main>`,
  url,
});

function pageCache(
  fetcher: PageFetcher,
  options: { maxEntries?: number; canPrefetch?: () => boolean } = {},
) {
  let now = 0;
  const cache = new PageCache({
    ttlMs,
    fetcher,
    now: () => now,
    canPrefetch: options.canPrefetch,
    maxEntries: options.maxEntries,
  });
  return { cache, advance: (ms: number) => (now += ms) };
}

test("reuses a cached page until its TTL expires", async () => {
  let calls = 0;
  const fetcher: PageFetcher = async (url) => {
    calls += 1;
    return page(url.href);
  };
  const { cache, advance } = pageCache(fetcher);
  const url = new URL("https://example.com/a");

  await cache.get(url);
  await cache.get(url);
  assert.equal(calls, 1);

  advance(ttlMs + 1);
  await cache.get(url);
  assert.equal(calls, 2);
});

test("evicts the least recently used entry when full", async () => {
  const calls = new Map<string, number>();
  const fetcher: PageFetcher = async (url) => {
    calls.set(url.href, (calls.get(url.href) ?? 0) + 1);
    return page(url.href);
  };
  const { cache } = pageCache(fetcher, { maxEntries: 2 });
  const a = new URL("https://example.com/a");
  const b = new URL("https://example.com/b");
  const c = new URL("https://example.com/c");

  await cache.get(a);
  await cache.get(b);
  await cache.get(a);
  await cache.get(c);
  await cache.get(a);
  assert.equal(calls.get(a.href), 1);
  await cache.get(b);
  assert.equal(calls.get(b.href), 2);
});

test("deduplicates concurrent requests for the same URL", async () => {
  let calls = 0;
  let resolve: ((value: ReturnType<typeof page>) => void) | undefined;
  const fetcher: PageFetcher = (_url) => {
    calls += 1;
    return new Promise((done) => {
      resolve = done;
    });
  };
  const { cache } = pageCache(fetcher);
  const url = new URL("https://example.com/a");

  const first = cache.get(url);
  const second = cache.get(url);
  resolve?.(page(url.href));

  assert.deepEqual(await first, await second);
  assert.equal(calls, 1);
});

test("aborting a waiter does not abort the shared request", async () => {
  const controller = new AbortController();
  let resolve: ((value: ReturnType<typeof page>) => void) | undefined;
  const fetcher: PageFetcher = () =>
    new Promise((done) => {
      resolve = done;
    });
  const { cache } = pageCache(fetcher);
  const url = new URL("https://example.com/a");

  const waiting = cache.get(url, controller.signal);
  controller.abort();
  await assert.rejects(waiting, { name: "AbortError" });

  resolve?.(page(url.href));
  assert.deepEqual(await cache.get(url), page(url.href));
});

test("shares a prefetched request with navigation", async () => {
  let calls = 0;
  const fetcher: PageFetcher = async (url) => {
    calls += 1;
    return page(url.href);
  };
  const { cache } = pageCache(fetcher);
  const url = new URL("https://example.com/a");

  cache.prefetch(url);
  await cache.get(url);

  assert.equal(calls, 1);
});

test("skips prefetching when the connection asks to save data", async () => {
  let calls = 0;
  const fetcher: PageFetcher = async (url) => {
    calls += 1;
    return page(url.href);
  };
  const { cache } = pageCache(fetcher, { canPrefetch: () => false });

  cache.prefetch(new URL("https://example.com/a"));
  assert.equal(calls, 0);
});

test("dispose aborts in-flight requests and clears the cache", async () => {
  let aborted = false;
  const fetcher: PageFetcher = (_url, signal) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        aborted = true;
        reject(signal.reason);
      });
    });
  const { cache } = pageCache(fetcher);

  void cache.get(new URL("https://example.com/a")).catch(() => undefined);
  cache.dispose();

  assert.equal(aborted, true);
  assert.equal(cache.size, 0);
});

test("removes an entry when a fetcher throws synchronously", async () => {
  const { cache } = pageCache(() => {
    throw new Error("fetch failed");
  });

  await assert.rejects(
    cache.get(new URL("https://example.com/a")),
    /fetch failed/,
  );
  assert.equal(cache.size, 0);
});
