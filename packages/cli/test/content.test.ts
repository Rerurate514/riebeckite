import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCommand } from "../src/cli.js";

test("parses content mutations without making them implicit writes", () => {
  assert.deepEqual(parseCommand(["content", "create", "notes/new.md"]), {
    name: "content",
    arguments: ["create", "notes/new.md"],
  });
  assert.deepEqual(
    parseCommand(["content", "move", "old.md", "new.md", "--apply"]),
    { name: "content", arguments: ["move", "old.md", "new.md", "--apply"] },
  );
  assert.deepEqual(
    parseCommand(["content", "plan", "move", "old.md", "new.md"]),
    {
      name: "content",
      arguments: ["plan", "move", "old.md", "new.md"],
    },
  );
  assert.deepEqual(parseCommand(["content", "apply", "plan.json", "--apply"]), {
    name: "content",
    arguments: ["apply", "plan.json", "--apply"],
  });
});
