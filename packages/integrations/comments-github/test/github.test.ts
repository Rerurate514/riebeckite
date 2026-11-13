import assert from "node:assert/strict";
import { test } from "node:test";
import { GitHubCommentsProvider, githubComments } from "../index.ts";

test("githubComments returns a provider with read capability", () => {
  const provider = githubComments({
    owner: "user",
    repo: "repo",
    token: "test-token",
  });
  assert.ok(provider instanceof GitHubCommentsProvider);
  assert.ok(provider.capabilities.has("read"));
});
