import assert from "node:assert/strict";
import { test } from "node:test";
import { crossesShellBoundary } from "../app/lib/shell-navigation";

test("SPA reloads when navigation changes the documentation shell", () => {
  assert.equal(crossesShellBoundary("/", "/docs/"), true);
  assert.equal(crossesShellBoundary("/docs/", "/themes"), true);
  assert.equal(
    crossesShellBoundary("/docs/", "/docs/guides/spa-navigation"),
    false,
  );
  assert.equal(crossesShellBoundary("/ja/docs/", "/docs/"), false);
});
