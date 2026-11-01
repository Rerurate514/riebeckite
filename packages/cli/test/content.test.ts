import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveInput } from "./command_fixture.js";

test("parses content mutations without making them implicit writes", () => {
  assert.deepEqual(
    resolveInput(["content", "create", "notes/new.md"]).rawArguments,
    ["create", "notes/new.md"],
  );
  assert.deepEqual(
    resolveInput(["content", "move", "old.md", "new.md", "--apply"])
      .rawArguments,
    ["move", "old.md", "new.md", "--apply"],
  );
  assert.deepEqual(
    resolveInput(["content", "plan", "move", "old.md", "new.md"]).rawArguments,
    ["plan", "move", "old.md", "new.md"],
  );
  assert.deepEqual(
    resolveInput(["content", "apply", "plan.json", "--apply"]).rawArguments,
    ["apply", "plan.json", "--apply"],
  );
});
