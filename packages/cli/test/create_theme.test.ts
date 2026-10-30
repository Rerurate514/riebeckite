import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parseCommand } from "../src/cli.js";
import { runCreateTheme } from "../src/commands/create_theme.js";
import { renderThemeIndex } from "../src/theme_generator/templates.js";

test("parses create theme options and lists templates", () => {
  assert.deepEqual(
    parseCommand([
      "create",
      "theme",
      "my-theme",
      "--template",
      "blog",
      "--features",
      "callouts,print-styles",
      "--no-dark-mode",
    ]),
    {
      name: "create-theme",
      themeName: "my-theme",
      directory: "themes/my-theme",
      template: "blog",
      features: ["callouts", "print-styles"],
      darkMode: false,
      tests: true,
      documentation: true,
      register: false,
    },
  );
  assert.deepEqual(parseCommand(["create", "theme", "--list"]), {
    name: "create-theme-list",
  });
  assert.throws(
    () => parseCommand(["create", "theme", "Bad_Name"]),
    /kebab-case/,
  );
  assert.throws(
    () => parseCommand(["create", "theme", "example", "--template", "unknown"]),
    /Unknown theme template/,
  );
});

test("typechecks a generated theme", async () => {
  const packageRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const directory = await fs.mkdtemp(
    path.join(packageRoot, "generated-theme-"),
  );
  const indexPath = path.join(directory, "index.ts");
  await fs.writeFile(indexPath, renderThemeIndex("example"), "utf8");
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

test("creates a local theme atomically and registers a recognized theme field", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-theme-"),
  );
  const previous = process.cwd();
  process.chdir(directory);
  try {
    await fs.writeFile(
      "riebeckite.config.ts",
      'import { defineConfig } from "@riebeckite/core";\n\nexport default defineConfig({\n  theme: previousTheme(),\n  plugins: [],\n});\n',
      "utf8",
    );
    await runCreateTheme({
      name: "example-theme",
      directory: "themes/example-theme",
      template: "documentation",
      features: ["print-styles"],
      darkMode: true,
      tests: true,
      documentation: true,
      register: true,
    });
    const css = await fs.readFile(
      "themes/example-theme/styles/theme.css",
      "utf8",
    );
    const config = await fs.readFile("riebeckite.config.ts", "utf8");
    assert.match(css, /\.rr-callout/);
    assert.match(css, /@media print/);
    assert.match(
      config,
      /import \{ exampleThemeTheme \} from "\.\/themes\/example-theme\/index"/,
    );
    assert.match(config, /theme: exampleThemeTheme\(\),/);
    await assert.rejects(
      () =>
        runCreateTheme({
          name: "example-theme",
          directory: "themes/example-theme",
          template: "minimal",
          features: [],
          darkMode: true,
          tests: false,
          documentation: false,
          register: false,
        }),
      /Refusing to overwrite/,
    );
  } finally {
    process.chdir(previous);
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("rejects theme paths outside themes", async () => {
  await assert.rejects(
    () =>
      runCreateTheme({
        name: "example",
        directory: "..",
        template: "minimal",
        features: [],
        darkMode: true,
        tests: false,
        documentation: false,
        register: false,
      }),
    /inside themes/,
  );
});

test("does not alter a theme configuration that is not safe to replace", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-theme-"),
  );
  const previous = process.cwd();
  process.chdir(directory);
  try {
    const config =
      'export default defineConfig({\n  theme: { name: "custom" },\n});\n';
    await fs.writeFile("riebeckite.config.ts", config, "utf8");
    await runCreateTheme({
      name: "example",
      directory: "themes/example",
      template: "blank",
      features: [],
      darkMode: false,
      tests: false,
      documentation: false,
      register: true,
    });
    assert.equal(await fs.readFile("riebeckite.config.ts", "utf8"), config);
  } finally {
    process.chdir(previous);
    await fs.rm(directory, { recursive: true, force: true });
  }
});
