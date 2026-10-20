import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parseCommand } from "../src/cli.js";
import { runCreatePageType } from "../src/commands/create_page_type.js";
import { renderPageTypeModule } from "../src/page_type_generator/templates.js";

test("parses PageType options", () => {
  assert.deepEqual(
    parseCommand([
      "create",
      "page-type",
      "glossary",
      "--plugin",
      "reference",
      "--path",
      "/reference/glossary/",
      "--with-tests",
      "--register",
    ]),
    {
      name: "create-page-type",
      options: {
        name: "glossary",
        plugin: "reference",
        path: "/reference/glossary/",
        tests: true,
        register: true,
      },
    },
  );
  assert.throws(
    () =>
      parseCommand([
        "create",
        "page-type",
        "glossary",
        "--path",
        "/../secret/",
      ]),
    /normalized URL path/,
  );
});

test("typechecks the generated PageType module", async () => {
  const packageRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const directory = await fs.mkdtemp(
    path.join(packageRoot, "generated-page-type-"),
  );
  const modulePath = path.join(directory, "glossary.ts");
  await fs.writeFile(
    modulePath,
    renderPageTypeModule("glossary", "/glossary/"),
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
        modulePath,
      ],
      { cwd: process.cwd(), stdio: "pipe" },
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("creates a public PageType Plugin with a routable page", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-page-type-"),
  );
  const previous = process.cwd();
  process.chdir(directory);
  try {
    await runCreatePageType({
      name: "glossary",
      path: "/glossary/",
      tests: true,
      register: false,
    });
    const index = await fs.readFile("extensions/glossary/index.ts", "utf8");
    assert.match(index, /pageTypes/);
    assert.match(index, /discoverableEntries/);
    assert.match(index, /"\/glossary\/"/);
    await assert.rejects(
      () =>
        runCreatePageType({
          name: "glossary",
          path: "/glossary/",
          tests: false,
          register: false,
        }),
      /Refusing to overwrite/,
    );
  } finally {
    process.chdir(previous);
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("adds a PageType without replacing a recognized Plugin", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-page-type-"),
  );
  const previous = process.cwd();
  process.chdir(directory);
  try {
    await fs.mkdir("extensions/example", { recursive: true });
    await fs.writeFile(
      "extensions/example/index.ts",
      'import { definePlugin } from "@riebeckite/core";\n\nexport const example = () => definePlugin({ name: "example", pageTypes: [] });\n',
      "utf8",
    );
    await runCreatePageType({
      name: "glossary",
      plugin: "example",
      path: "/glossary/",
      tests: false,
      register: false,
    });
    const index = await fs.readFile("extensions/example/index.ts", "utf8");
    const page = await fs.readFile(
      "extensions/example/page_types/glossary.ts",
      "utf8",
    );
    assert.match(index, /GlossaryPageType/);
    assert.match(page, /discoverableEntries/);
    await assert.rejects(
      () =>
        runCreatePageType({
          name: "terms",
          plugin: "example",
          path: "/glossary/",
          tests: false,
          register: false,
        }),
      /path already exists/,
    );
  } finally {
    process.chdir(previous);
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("registers an existing PageType Plugin only in a recognized config array", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-page-type-"),
  );
  const previous = process.cwd();
  process.chdir(directory);
  try {
    await fs.mkdir("extensions/example", { recursive: true });
    await fs.writeFile(
      "extensions/example/index.ts",
      'import { definePlugin } from "@riebeckite/core";\n\nexport const examplePlugin = () => definePlugin({ name: "example", pageTypes: [] });\n',
      "utf8",
    );
    await fs.writeFile(
      "riebeckite.config.ts",
      "export default { plugins: [\n  ], };\n",
      "utf8",
    );
    await runCreatePageType({
      name: "glossary",
      plugin: "example",
      path: "/glossary/",
      tests: false,
      register: true,
    });
    assert.match(
      await fs.readFile("riebeckite.config.ts", "utf8"),
      /examplePlugin\(\)/,
    );
  } finally {
    process.chdir(previous);
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("does not update a Plugin when its PageType test already exists", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-page-type-"),
  );
  const previous = process.cwd();
  process.chdir(directory);
  try {
    await fs.mkdir("extensions/example/test", { recursive: true });
    const index =
      'import { definePlugin } from "@riebeckite/core";\n\nexport const example = () => definePlugin({ name: "example", pageTypes: [] });\n';
    await fs.writeFile("extensions/example/index.ts", index, "utf8");
    await fs.writeFile(
      "extensions/example/test/glossary.test.ts",
      "existing",
      "utf8",
    );
    await assert.rejects(
      () =>
        runCreatePageType({
          name: "glossary",
          plugin: "example",
          path: "/glossary/",
          tests: true,
          register: false,
        }),
      /Refusing to overwrite/,
    );
    assert.equal(
      await fs.readFile("extensions/example/index.ts", "utf8"),
      index,
    );
    await assert.rejects(() =>
      fs.access("extensions/example/page_types/glossary.ts"),
    );
  } finally {
    process.chdir(previous);
    await fs.rm(directory, { recursive: true, force: true });
  }
});
