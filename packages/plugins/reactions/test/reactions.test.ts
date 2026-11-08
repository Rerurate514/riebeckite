import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_REACTIONS,
  REACTION_TYPES,
  type PageReactions,
} from "../src/types.js";
import {
  resolveReactionsOptions,
  validateReactionsOptions,
  DEFAULT_REACTIONS_ARIA_LABEL,
  DEFAULT_REACTIONS_CLASS_NAME,
} from "../src/options.js";
import { MemoryReactionsProvider } from "../src/provider.js";
import { renderReactions, REACTIONS_ATTRIBUTE } from "../src/render.js";
import { reactions, REACTIONS_PLUGIN_NAME } from "../index.ts";

test("resolveReactionsOptions applies defaults", () => {
  const resolved = resolveReactionsOptions();
  assert.ok(resolved.provider instanceof MemoryReactionsProvider);
  assert.equal(resolved.reactions.length, DEFAULT_REACTIONS.length);
  assert.equal(resolved.className, DEFAULT_REACTIONS_CLASS_NAME);
  assert.equal(resolved.ariaLabel, DEFAULT_REACTIONS_ARIA_LABEL);
});

test("resolveReactionsOptions filters and dedupes reaction types", () => {
  const resolved = resolveReactionsOptions({ reactions: ["like", "like", "heart"] });
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
  const before = await provider.getReactions("page-1");
  assert.equal(before.counts.length, 0);

  const afterAdd = await provider.addReaction("page-1", "like");
  assert.equal(afterAdd.counts.find((c) => c.type === "like")?.count, 1);
  assert.equal(afterAdd.counts.find((c) => c.type === "like")?.reacted, true);

  const afterAddAgain = await provider.addReaction("page-1", "like");
  assert.equal(afterAddAgain.counts.find((c) => c.type === "like")?.count, 1);

  const afterRemove = await provider.removeReaction("page-1", "like");
  assert.equal(afterRemove.counts.find((c) => c.type === "like"), undefined);
});

test("renderReactions emits buttons with counts and aria state", () => {
  const data: PageReactions = {
    contentId: "page-1",
    counts: [{ type: "like", count: 3, reacted: true }],
  };
  const html = renderReactions(
    DEFAULT_REACTIONS,
    data,
    DEFAULT_REACTIONS_CLASS_NAME,
    DEFAULT_REACTIONS_ARIA_LABEL,
  );
  assert.ok(html.includes(REACTIONS_ATTRIBUTE));
  assert.ok(html.includes('data-reaction-type="like"'));
  assert.ok(html.includes('aria-pressed="true"'));
  assert.ok(html.includes(">3</span>"));
  assert.ok(html.includes('data-content-id="page-1"'));
});

test("reactions() returns a plugin with the expected name", () => {
  const plugin = reactions();
  assert.equal(plugin.name, REACTIONS_PLUGIN_NAME);
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
