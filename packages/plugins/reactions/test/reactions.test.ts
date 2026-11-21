import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import { REACTIONS_PLUGIN_NAME, Reactions, reactions } from "../index.ts";
import { createReactionsEndpoints } from "../src/endpoints.js";
import {
  DEFAULT_REACTIONS_ARIA_LABEL,
  DEFAULT_REACTIONS_CLASS_NAME,
  resolveReactionsOptions,
  validateReactionsOptions,
} from "../src/options.js";
import { MemoryReactionsProvider } from "../src/provider.js";
import { REACTIONS_ATTRIBUTE } from "../src/render.js";
import {
  DEFAULT_REACTIONS,
  type PageReactions,
  REACTION_TYPES,
} from "../src/types.js";

(globalThis as { React?: unknown }).React = { createElement, Fragment };

test("resolveReactionsOptions applies defaults", () => {
  const resolved = resolveReactionsOptions();
  assert.ok(resolved.provider instanceof MemoryReactionsProvider);
  assert.equal(resolved.reactions.length, DEFAULT_REACTIONS.length);
  assert.equal(resolved.className, DEFAULT_REACTIONS_CLASS_NAME);
  assert.equal(resolved.ariaLabel, DEFAULT_REACTIONS_ARIA_LABEL);
});

test("resolveReactionsOptions filters and dedupes reaction types", () => {
  const resolved = resolveReactionsOptions({
    reactions: ["like", "like", "heart"],
  });
  assert.deepEqual(
    resolved.reactions.map((r) => r.type),
    ["like", "heart"],
  );
});

test("validateReactionsOptions rejects unknown reaction types", () => {
  const issues = validateReactionsOptions({
    reactions: ["like", "unknown" as never],
  });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].path, "reactions[1]");
});

test("validateReactionsOptions rejects invalid provider", () => {
  const issues = validateReactionsOptions({ provider: {} as never });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].path, "provider");
});

test("MemoryReactionsProvider counts add and remove", async () => {
  const provider = new MemoryReactionsProvider();
  const before = await provider.getReactions("page-1", "visitor-1");
  assert.equal(before.counts.length, 0);

  const afterAdd = await provider.addReaction("page-1", "like", "visitor-1");
  assert.equal(afterAdd.counts.find((c) => c.type === "like")?.count, 1);
  assert.equal(afterAdd.counts.find((c) => c.type === "like")?.reacted, true);

  const afterAddAgain = await provider.addReaction(
    "page-1",
    "like",
    "visitor-1",
  );
  assert.equal(afterAddAgain.counts.find((c) => c.type === "like")?.count, 1);

  const afterRemove = await provider.removeReaction(
    "page-1",
    "like",
    "visitor-1",
  );
  assert.equal(
    afterRemove.counts.find((c) => c.type === "like"),
    undefined,
  );
});

test("Reactions renders buttons with counts and aria state", () => {
  const data: PageReactions = {
    contentId: "page-1",
    counts: [{ type: "like", count: 3, reacted: true }],
  };
  const html = renderToString(
    createElement(Reactions, {
      reactions: DEFAULT_REACTIONS,
      data,
    }),
  );
  assert.ok(html.includes(REACTIONS_ATTRIBUTE));
  assert.ok(html.includes('data-reaction-type="like"'));
  assert.ok(html.includes('aria-pressed="true"'));
  assert.ok(html.includes(">3</span>"));
  assert.ok(html.includes('data-content-id="page-1"'));
  assert.ok(html.includes(" disabled"));
});

test("Reactions enables buttons when interactive", () => {
  const html = renderToString(
    createElement(Reactions, {
      reactions: DEFAULT_REACTIONS,
      data: { contentId: "page-1", counts: [] },
      interactive: true,
    }),
  );
  assert.ok(!html.includes(" disabled"));
});

test("reactions() returns a plugin with the expected name", () => {
  const plugin = reactions();
  assert.equal(plugin.name, REACTIONS_PLUGIN_NAME);
});

test("reactions() gates the client entry on an endpoint", () => {
  assert.equal(reactions().clientEntries?.length ?? 0, 0);

  const plugin = reactions({
    endpoint: "/reactions",
    resolveVisitorKey: () => "visitor-1",
  });
  const entry = plugin.clientEntries?.[0];
  assert.equal(entry?.presenceSelector, "[data-rr-reactions]");
  assert.deepEqual(entry?.publicConfig, { endpoint: "/reactions" });
});

test("validateReactionsOptions requires a resolver for endpoints", () => {
  const issues = validateReactionsOptions({ endpoint: "/reactions" });
  assert.equal(issues[0].path, "resolveVisitorKey");
});

test("reaction endpoints reject unknown content and write for resolved visitors", async () => {
  const provider = new MemoryReactionsProvider();
  const endpoints = createReactionsEndpoints(
    resolveReactionsOptions({
      provider,
      endpoint: "/reactions",
      resolveVisitorKey: () => "visitor-1",
    }),
  );
  const context = {
    manifest: { publicEntries: [{ contentId: "post-1" }] },
    request: {
      method: "POST" as const,
      url: "https://example.com/reactions",
      path: "/reactions",
      query: {},
      headers: {},
      body: JSON.stringify({
        action: "add",
        contentId: "post-1",
        type: "like",
      }),
    },
  };
  const response = await endpoints[1].handler(context as never);
  assert.equal(response.status, undefined);
  assert.deepEqual(response.json, {
    contentId: "post-1",
    counts: [{ type: "like", count: 1, reacted: true }],
  });

  const unknown = await endpoints[0].handler({
    ...context,
    request: {
      ...context.request,
      method: "GET",
      query: { contentId: "unknown" },
    },
  } as never);
  assert.equal(unknown.status, 400);
});

test("REACTION_TYPES contains the default set", () => {
  assert.deepEqual([...REACTION_TYPES].sort(), [
    "celebrate",
    "curious",
    "heart",
    "insightful",
    "like",
  ]);
});
