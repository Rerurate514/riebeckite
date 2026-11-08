import assert from "node:assert/strict";
import { test } from "node:test";
import { GitHubReactionsProvider, githubReactions } from "../index.ts";

test("githubReactions returns a provider with read capability", () => {
  const provider = githubReactions({
    owner: "user",
    repo: "repo",
    token: "test-token",
  });
  assert.ok(provider instanceof GitHubReactionsProvider);
  assert.ok(provider.capabilities.has("read"));
  assert.ok(!provider.capabilities.has("write"));
});

test("addReaction throws read-only error", async () => {
  const provider = githubReactions({
    owner: "user",
    repo: "repo",
    token: "test-token",
  });
  await assert.rejects(() => provider.addReaction("p", "like"), /read-only/);
});
