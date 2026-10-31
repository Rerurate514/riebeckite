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
});
