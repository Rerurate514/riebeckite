import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCommand } from "../src/cli.js";
import { createHelp } from "../src/commands/create.js";

test("parses unified create targets without changing generator commands", () => {
  assert.deepEqual(parseCommand(["create"]), { name: "create-interactive" });
  assert.deepEqual(
    parseCommand(["create", "site", "my-site", "--preset", "minimal"]),
    {
      name: "create-site",
      arguments: ["my-site", "--preset", "minimal"],
    },
  );
  assert.deepEqual(parseCommand(["create", "--help"]), { name: "create-help" });
  assert.match(createHelp(), /create site/);
  assert.match(createHelp(), /create plugin/);
  assert.match(createHelp(), /create theme/);
});

test("parses theme preview options", () => {
  assert.deepEqual(
    parseCommand([
      "theme",
      "preview",
      "my-theme",
      "--port",
      "4173",
      "--no-open",
    ]),
    { name: "theme-preview", themeName: "my-theme", port: 4173, open: false },
  );
  assert.throws(
    () => parseCommand(["theme", "preview"]),
    /requires a local Theme name/,
  );
  assert.throws(
    () => parseCommand(["theme", "preview", "my-theme", "--port", "0"]),
    /between 1 and 65535/,
  );
});
