import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveCliCommand } from "@riebeckite/core";
import { createBuiltinRegistry } from "../src/command/builtins.js";
import { createHelp } from "../src/commands/create.js";
import { resolveCommand, resolveInput } from "./command_fixture.js";

test("parses unified create targets without changing generator commands", () => {
  assert.equal(resolveCommand(["create"]).registration.command.id, "create");
  assert.deepEqual(
    resolveInput(["create", "site", "my-site", "--preset", "minimal"])
      .rawArguments,
    ["my-site", "--preset", "minimal"],
  );
  const help = resolveCliCommand(createBuiltinRegistry(), ["create", "--help"]);
  assert.equal(help.kind, "help");
  assert.equal(help.kind === "help" ? help.path : undefined, "create");
  assert.match(createHelp(), /create site/);
  assert.match(createHelp(), /create plugin/);
  assert.match(createHelp(), /create theme/);
});

test("parses theme preview options", () => {
  const preview = resolveInput([
    "theme",
    "preview",
    "my-theme",
    "--port",
    "4173",
    "--no-open",
  ]);
  assert.equal(preview.arguments.name, "my-theme");
  assert.equal(preview.options.port, 4173);
  assert.equal(preview.options.open, false);
  assert.throws(
    () => resolveInput(["theme", "preview"]),
    /Missing required argument: name/,
  );
  assert.throws(
    () => resolveInput(["theme", "preview", "my-theme", "--port", "0"]),
    /between 1 and 65535/,
  );
});

test("parses plugin dev options", () => {
  const dev = resolveInput([
    "plugin",
    "dev",
    "./extensions/my-plugin",
    "--port",
    "4321",
    "--no-open",
  ]);
  assert.equal(dev.arguments.path, "./extensions/my-plugin");
  assert.equal(dev.options.port, 4321);
  assert.equal(dev.options.open, false);

  const defaults = resolveInput(["plugin", "dev", "extensions/my-plugin"]);
  assert.equal(defaults.arguments.path, "extensions/my-plugin");
  assert.equal(defaults.options.port, undefined);
  assert.equal(defaults.options.open, true);

  assert.throws(
    () => resolveInput(["plugin", "dev"]),
    /Missing required argument: path/,
  );
  assert.throws(
    () =>
      resolveInput([
        "plugin",
        "dev",
        "extensions/my-plugin",
        "--port",
        "70000",
      ]),
    /between 1 and 65535/,
  );
  assert.throws(
    () => resolveInput(["plugin", "dev", "one", "two"]),
    /Unexpected argument/,
  );
  assert.throws(
    () => resolveInput(["plugin", "dev", "one", "--unknown"]),
    /Unknown option/,
  );
});
