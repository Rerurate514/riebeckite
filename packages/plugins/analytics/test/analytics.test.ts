import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "@riebeckite/core";
import {
  analytics,
  assertAnalyticsQuerySupported,
  initAnalytics,
  MemoryAnalyticsProvider,
  UnsupportedAnalyticsQueryError,
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
