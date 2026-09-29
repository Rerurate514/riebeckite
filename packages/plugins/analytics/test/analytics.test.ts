import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "@riebeckite/core";
import {
  analytics,
  assertAnalyticsQuerySupported,
  initAnalytics,
  MemoryAnalyticsProvider,
  requiredCapabilityForQuery,
  supportsAnalyticsCapability,
  UnsupportedAnalyticsQueryError,
  validateAnalyticsOptions,
} from "../index.js";

test("memory provider aggregates stable content IDs with optional time ranges", async () => {
  const provider = new MemoryAnalyticsProvider([
    {
      type: "page_view",
      contentId: "guide-1",
      occurredAt: "2026-01-01T00:00:00.000Z",
    },
    {
      type: "page_view",
      contentId: "guide-1",
      occurredAt: "2026-01-02T00:00:00.000Z",
    },
    {
      type: "page_view",
      contentId: "guide-2",
      occurredAt: "2026-01-02T00:00:00.000Z",
    },
  ]);

  assert.deepEqual(
    await provider.query({
      type: "content_page_views",
      contentId: "guide-1",
      timeRange: { from: "2026-01-02T00:00:00.000Z" },
    }),
    { type: "content_page_views", contentId: "guide-1", pageViews: 1 },
  );
  assert.deepEqual(
    await provider.query({ type: "popular_content", limit: 1 }),
    {
      type: "popular_content",
      items: [{ contentId: "guide-1", pageViews: 2 }],
    },
  );
});

test("unsupported queries name their missing capability", () => {
  const provider = {
    capabilities: new Set(["capture"] as const),
    async capture() {},
    async query() {
      throw new Error("not reached");
    },
  };
  assert.throws(
    () =>
      assertAnalyticsQuerySupported(provider, {
        type: "content_page_views",
        contentId: "guide-1",
      }),
    UnsupportedAnalyticsQueryError,
  );
});

test("plugin exposes only collector configuration to the browser", () => {
  const provider = new MemoryAnalyticsProvider();
  const config = resolveConfig({
    site: { title: "Test" },
    plugins: [
      analytics({
        provider,
        publicConfig: { collectorUrl: "/analytics/events" },
      }),
    ],
  });

  assert.deepEqual(config.plugins[0]?.clientEntries?.[0]?.publicConfig, {
    collectorUrl: "/analytics/events",
  });
  assert.doesNotMatch(
    JSON.stringify(config.plugins[0]?.clientEntries),
    /provider/,
  );
});

test("browser initializer sends one stable-ID page view with contextual metadata", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalDocument = Object.getOwnPropertyDescriptor(
    globalThis,
    "document",
  );
  const originalFetch = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
  const documentElement = {
    lang: "ja",
    hasAttribute: () => requests.length > 0,
    setAttribute: () => undefined,
  };

  Object.defineProperties(globalThis, {
    window: {
      configurable: true,
      value: { location: { pathname: "/renamed-guide" } },
    },
    document: {
      configurable: true,
      value: {
        documentElement,
        querySelector: () => ({ getAttribute: () => "guide-1" }),
      },
    },
    fetch: {
      configurable: true,
      value: (url: string, init: RequestInit) => {
        requests.push({ url, init });
        return Promise.resolve(new Response());
      },
    },
  });

  try {
    initAnalytics({ collectorUrl: "/analytics/events" });
    initAnalytics({ collectorUrl: "/analytics/events" });
    await Promise.resolve();

    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.url, "/analytics/events");
    assert.deepEqual(JSON.parse(String(requests[0]?.init?.body)), {
      type: "page_view",
      contentId: "guide-1",
      occurredAt: new Date(
        JSON.parse(String(requests[0]?.init?.body)).occurredAt,
      ).toISOString(),
      path: "/renamed-guide",
      lang: "ja",
    });
  } finally {
    restoreGlobal("window", originalWindow);
    restoreGlobal("document", originalDocument);
    restoreGlobal("fetch", originalFetch);
  }
});

test("option validation accepts absolute URLs and site-relative paths", () => {
  const provider = new MemoryAnalyticsProvider();
  for (const collectorUrl of [
    "https://analytics.example.com/events",
    "http://analytics.example.com/events",
    "/analytics/events",
    "/events",
  ]) {
    assert.deepEqual(
      validateAnalyticsOptions({ provider, publicConfig: { collectorUrl } }),
      [],
    );
  }
});

test("option validation rejects missing or unsafe collector URLs", () => {
  const provider = new MemoryAnalyticsProvider();
  for (const collectorUrl of [
    "",
    "   ",
    " /events",
    "trailing-space/ ",
    "//analytics.example.com/events",
    "ftp://analytics.example.com/events",
    "javascript:alert(1)",
  ]) {
    const issues = validateAnalyticsOptions({
      provider,
      publicConfig: { collectorUrl },
    });
    assert.equal(
      issues.length,
      1,
      `expected collectorUrl to be rejected: ${collectorUrl}`,
    );
    assert.equal(issues[0]?.path, "publicConfig.collectorUrl");
  }
});

test("option validation rejects a provider that is not a full analytics provider", () => {
  const issues = validateAnalyticsOptions({
    provider: { capabilities: new Set(["capture" as const]) },
    publicConfig: { collectorUrl: "/events" },
  } as never);
  assert.equal(issues.length, 1);
  assert.equal(issues[0]?.path, "provider");
});

test("option validation reports missing provider and collector together", () => {
  const issues = validateAnalyticsOptions(undefined);
  assert.deepEqual(
    issues.map((issue) => issue.path),
    ["provider", "publicConfig.collectorUrl"],
  );
});

test("memory provider applies inclusive time range bounds", async () => {
  const provider = new MemoryAnalyticsProvider([
    pageView("a", "2026-01-01T00:00:00.000Z"),
    pageView("a", "2026-01-02T00:00:00.000Z"),
    pageView("a", "2026-01-03T00:00:00.000Z"),
  ]);
  assert.deepEqual(
    await provider.query({
      type: "content_page_views",
      contentId: "a",
      timeRange: {
        from: "2026-01-02T00:00:00.000Z",
        to: "2026-01-02T00:00:00.000Z",
      },
    }),
    { type: "content_page_views", contentId: "a", pageViews: 1 },
  );
});

test("memory provider excludes events outside the time range", async () => {
  const provider = new MemoryAnalyticsProvider([
    pageView("a", "2026-01-01T00:00:00.000Z"),
    pageView("a", "2026-01-10T00:00:00.000Z"),
  ]);
  const result = await provider.query({
    type: "popular_content",
    timeRange: { from: "2026-01-09T00:00:00.000Z" },
  });
  assert.deepEqual(result, {
    type: "popular_content",
    items: [{ contentId: "a", pageViews: 1 }],
  });
});

test("memory provider ignores custom events and defaults popular limit", async () => {
  const events = [
    pageView("a", "2026-01-01T00:00:00.000Z"),
    pageView("a", "2026-01-01T00:00:00.000Z"),
    pageView("b", "2026-01-01T00:00:00.000Z"),
    pageView("c", "2026-01-01T00:00:00.000Z"),
    pageView("c", "2026-01-01T00:00:00.000Z"),
    { type: "download", occurredAt: "2026-01-02T00:00:00.000Z" },
  ] as const;
  const provider = new MemoryAnalyticsProvider(events);
  const result = (await provider.query({
    type: "popular_content",
    limit: 2,
  })) as { items: readonly { contentId: string; pageViews: number }[] };
  assert.deepEqual(
    [...result.items].map((item) => [item.contentId, item.pageViews]),
    [
      ["a", 2],
      ["c", 2],
    ],
  );
  assert.deepEqual(await provider.query({ type: "popular_content" }), {
    type: "popular_content",
    items: [
      { contentId: "a", pageViews: 2 },
      { contentId: "c", pageViews: 2 },
      { contentId: "b", pageViews: 1 },
    ],
  });
});

test("popular ranking breaks ties by content ID", async () => {
  const provider = new MemoryAnalyticsProvider([
    pageView("b", "2026-01-01T00:00:00.000Z"),
    pageView("a", "2026-01-01T00:00:00.000Z"),
  ]);
  const result = (await provider.query({
    type: "popular_content",
  })) as { items: readonly { contentId: string }[] };
  assert.deepEqual(
    result.items.map((item) => item.contentId),
    ["a", "b"],
  );
});

test("every query type maps to its own required capability", () => {
  assert.equal(
    requiredCapabilityForQuery({ type: "content_page_views", contentId: "a" }),
    "content_page_views",
  );
  assert.equal(
    requiredCapabilityForQuery({ type: "popular_content" }),
    "popular_content",
  );
});

test("supportsAnalyticsCapability distinguishes capture-only providers", () => {
  const captureOnly = new MemoryAnalyticsProvider();
  const provider = {
    capabilities: new Set(["capture"] as const),
    async capture() {},
    async query() {},
  };
  assert.equal(
    supportsAnalyticsCapability(captureOnly, "popular_content"),
    true,
  );
  assert.equal(supportsAnalyticsCapability(provider, "capture"), true);
  assert.equal(supportsAnalyticsCapability(provider, "popular_content"), false);
});

function pageView(contentId: string, occurredAt: string) {
  return { type: "page_view" as const, contentId, occurredAt };
}

function restoreGlobal(
  name: string,
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
    return;
  }
  Reflect.deleteProperty(globalThis, name);
}
