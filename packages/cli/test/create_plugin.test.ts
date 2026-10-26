import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parseCommand } from "../src/cli.js";
import { runCreatePlugin } from "../src/commands/create_plugin.js";
import { PLUGIN_FEATURE_IDS } from "../src/plugin_generator/registry.js";
import {
  renderPluginFiles,
  renderPluginIndex,
} from "../src/plugin_generator/templates.js";

test("parses create plugin features", () => {
  assert.deepEqual(
    parseCommand([
      "create",
      "plugin",
      "my-plugin",
      "--features",
      "transform,diagnostics,cache",
    ]),
    {
      name: "create-plugin",
      pluginName: "my-plugin",
      directory: "extensions/my-plugin",
      features: ["transform", "diagnostics", "cache"],
      tests: true,
      documentation: true,
      register: false,
    },
  );
  assert.throws(
    () =>
      parseCommand(["create", "plugin", "Bad_Name", "--template", "transform"]),
    /kebab-case/,
  );
  assert.throws(
    () =>
      parseCommand(["create", "plugin", "example", "--template", "unknown"]),
    /Unknown plugin feature/,
  );
});

test("renders a plugin with a documented feature", () => {
  const first = renderPluginFiles("example", ["transform"], true, true);
  assert.match(first.get("index.ts") ?? "", /definePlugin/);
});

test("typechecks a plugin composed from every feature", async () => {
  const packageRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const directory = await fs.mkdtemp(
    path.join(packageRoot, "generated-plugin-"),
  );
  const indexPath = path.join(directory, "index.ts");
  await fs.writeFile(
    indexPath,
    renderPluginIndex("example", PLUGIN_FEATURE_IDS),
    "utf8",
  );
  try {
    execFileSync(
      process.execPath,
      [
        path.resolve(packageRoot, "../../node_modules/typescript/bin/tsc"),
        "--noEmit",
        "--strict",
        "--target",
        "ESNext",
        "--module",
        "ESNext",
        "--moduleResolution",
        "Bundler",
        "--skipLibCheck",
        indexPath,
      ],
      { cwd: process.cwd(), stdio: "pipe" },
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("creates atomically without overwriting an existing directory", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-plugin-"),
  );
  const previous = process.cwd();
  process.chdir(directory);
  try {
    await runCreatePlugin({
      name: "example",
      directory: "extensions/example",
      features: ["transform"],
      tests: true,
      documentation: true,
      register: false,
    });
    assert.match(
      await fs.readFile("extensions/example/index.ts", "utf8"),
      /name: "example"/,
    );
    await assert.rejects(
      () =>
        runCreatePlugin({
          name: "example",
          directory: "extensions/example",
          features: ["transform"],
          tests: true,
          documentation: true,
          register: false,
        }),
      /Refusing to overwrite/,
    );
  } finally {
    process.chdir(previous);
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("registers a generated plugin only in a recognized config array", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-plugin-"),
  );
  const previous = process.cwd();
  process.chdir(directory);
  try {
    const original = `import { defineConfig } from "@riebeckite/core";\n\nexport default defineConfig({\n  plugins: [\n  ],\n});\n`;
    await fs.writeFile("riebeckite.config.ts", original, "utf8");
    await runCreatePlugin({
      name: "example-plugin",
      directory: "extensions/example-plugin",
      features: ["diagnostics"],
      tests: false,
      documentation: false,
      register: true,
    });
    const registered = await fs.readFile("riebeckite.config.ts", "utf8");
    assert.match(
      registered,
      /import \{ examplePlugin \} from "\.\/extensions\/example-plugin\/index"/,
    );
    assert.match(registered, /plugins: \[\n {4}examplePlugin\(\),\n {2}\]/);
  } finally {
    process.chdir(previous);
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("rejects paths outside extensions", async () => {
  await assert.rejects(
    () =>
      runCreatePlugin({
        name: "example",
        directory: "..",
        features: ["transform"],
        tests: false,
        documentation: false,
        register: false,
      }),
    /inside extensions/,
  );
});
