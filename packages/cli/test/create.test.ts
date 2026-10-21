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

test("parses plugin dev options", () => {
  assert.deepEqual(
    parseCommand([
      "plugin",
      "dev",
      "./extensions/my-plugin",
      "--port",
      "4321",
      "--no-open",
    ]),
    {
      name: "plugin-dev",
      pluginPath: "./extensions/my-plugin",
      port: 4321,
      open: false,
    },
  );
  assert.deepEqual(parseCommand(["plugin", "dev", "extensions/my-plugin"]), {
    name: "plugin-dev",
    pluginPath: "extensions/my-plugin",
    port: undefined,
    open: true,
  });
  assert.throws(
    () => parseCommand(["plugin", "dev"]),
    /requires a local plugin path/,
  );
  assert.throws(
    () =>
      parseCommand([
        "plugin",
        "dev",
        "extensions/my-plugin",
        "--port",
        "70000",
      ]),
    /between 1 and 65535/,
  );
  assert.throws(
    () => parseCommand(["plugin", "dev", "one", "two"]),
    /accepts one plugin path/,
  );
  assert.throws(
    () => parseCommand(["plugin", "dev", "one", "--unknown"]),
    /Unknown plugin dev option/,
  );
});
