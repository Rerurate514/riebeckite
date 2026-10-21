import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parseCommand } from "../src/cli.js";
import { runCreateComponent } from "../src/commands/create_component.js";
import { renderComponent } from "../src/component_generator/templates.js";
import { listLocalPlugins } from "../src/local_plugins.js";

test("parses component options", () => {
  assert.deepEqual(
    parseCommand([
      "create",
      "component",
      "note-card",
      "--target",
      "plugin",
      "--plugin",
      "notes",
      "--with-tests",
      "--with-styles",
    ]),
    {
      name: "create-component",
      options: {
        name: "note-card",
        target: "plugin",
        plugin: "notes",
        theme: undefined,
        tests: true,
        styles: true,
      },
    },
  );
  assert.throws(
    () =>
      parseCommand(["create", "component", "note-card", "--target", "plugin"]),
    /--plugin is required/,
  );
});

test("typechecks the generated Plugin Component", async () => {
  const packageRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const directory = await fs.mkdtemp(
    path.join(packageRoot, "generated-component-"),
  );
  const componentPath = path.join(directory, "note-card.tsx");
  await fs.writeFile(
    componentPath,
    renderComponent("note-card", "plugin"),
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
        "--jsx",
        "react-jsx",
        "--jsxImportSource",
        "hono/jsx",
        "--skipLibCheck",
        componentPath,
      ],
      { cwd: process.cwd(), stdio: "pipe" },
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("creates isolated Site Component files", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-component-"),
  );
  const previous = process.cwd();
  process.chdir(directory);
  try {
    await runCreateComponent({
      name: "note-card",
      target: "site",
      tests: true,
      styles: true,
    });
    const component = await fs.readFile("app/components/note-card.tsx", "utf8");
    const css = await fs.readFile("app/components/note-card.css", "utf8");
    assert.match(component, /NoteCardProps/);
    assert.match(css, /\.rr-note-card/);
    assert.match(css, /--rb-color-/);
    assert.match(css, /focus-visible/);
  } finally {
    process.chdir(previous);
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("exports a Plugin Component and rejects Theme ownership", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-component-"),
  );
  const previous = process.cwd();
  process.chdir(directory);
  try {
    await fs.mkdir("extensions/notes", { recursive: true });
    await fs.writeFile("extensions/notes/index.ts", "export {};\n", "utf8");
    await runCreateComponent({
      name: "note-card",
      target: "plugin",
      plugin: "notes",
      tests: false,
      styles: false,
    });
    assert.match(
      await fs.readFile("extensions/notes/index.ts", "utf8"),
      /NoteCard/,
    );
    await assert.rejects(
      () =>
        runCreateComponent({
          name: "theme-card",
          target: "theme",
          tests: false,
          styles: false,
        }),
      /Themes do not own components/,
    );
  } finally {
    process.chdir(previous);
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("finds local Plugins and rejects a missing entry point", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-component-"),
  );
  const previous = process.cwd();
  process.chdir(directory);
  try {
    await fs.mkdir("extensions/notes", { recursive: true });
    await fs.writeFile("extensions/notes/index.ts", "export {};\n", "utf8");
    await fs.mkdir("extensions/incomplete", { recursive: true });
    await fs.mkdir("extensions/Invalid_Name", { recursive: true });
    await fs.writeFile(
      "extensions/Invalid_Name/index.ts",
      "export {};\n",
      "utf8",
    );
    assert.deepEqual(await listLocalPlugins(), ["notes"]);
    await assert.rejects(
      () =>
        runCreateComponent({
          name: "orphan-card",
          target: "plugin",
          plugin: "missing",
          tests: false,
          styles: false,
        }),
      /Create the Plugin first/,
    );
    await assert.rejects(() =>
      fs.access("extensions/missing/components/orphan-card.tsx"),
    );
  } finally {
    process.chdir(previous);
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("does not overwrite an existing component stylesheet", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-component-"),
  );
  const previous = process.cwd();
  process.chdir(directory);
  try {
    await fs.mkdir("app/components", { recursive: true });
    await fs.writeFile("app/components/note-card.css", "existing", "utf8");
    await assert.rejects(
      () =>
        runCreateComponent({
          name: "note-card",
          target: "site",
          tests: false,
          styles: true,
        }),
      /Refusing to overwrite/,
    );
    await assert.rejects(() => fs.access("app/components/note-card.tsx"));
  } finally {
    process.chdir(previous);
    await fs.rm(directory, { recursive: true, force: true });
  }
});
