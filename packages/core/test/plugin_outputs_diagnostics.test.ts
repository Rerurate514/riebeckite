import assert from "node:assert/strict";
import { test } from "node:test";
import { assertGoldenJson } from "@riebeckite/test";
import { ContentManager } from "../src/content/content_manager.js";
import type { ContentSource } from "../src/content/content_source.js";
import { definePlugin } from "../src/types/plugin.js";

function memorySource(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

const oneNote = {
  "note.md": "---\ntitle: Note\npublish: true\n---\n\n# Note\n",
};

test("manifest collects plugin diagnostics with owner attribution", async () => {
  const checker = definePlugin({
    name: "checker",
    addDiagnostics: () => [
      {
        code: "orphan-note",
        severity: "warning",
        message: "No backlinks",
        slug: "note",
      },
      {
        code: "broken-wikilink",
        severity: "error",
        message: "Missing [[x]]",
        pluginName: "external-rule",
      },
    ],
  });
  const tracker = definePlugin({
    name: "tracker",
    onContentLoaded: ({ diagnostics, slug }) => {
      diagnostics.push({
        code: "missing-frontmatter",
        severity: "info",
        message: `Loaded ${slug}`,
      });
    },
  });
  const manager = new ContentManager(memorySource(oneNote), [], {
    plugins: [checker, tracker],
  });

  const manifest = await manager.getManifest();

  assert.deepEqual(manifest.diagnostics, [
    {
      code: "missing-frontmatter",
      severity: "info",
      message: "Loaded note",
    },
    {
      code: "orphan-note",
      severity: "warning",
      message: "No backlinks",
      slug: "note",
      pluginName: "checker",
    },
    {
      code: "broken-wikilink",
      severity: "error",
      message: "Missing [[x]]",
      pluginName: "external-rule",
    },
  ]);
  assertGoldenJson(
    manifest.diagnostics,
    new URL("./__golden__/plugin_diagnostics.json", import.meta.url),
  );
});

test("manifest collects generated outputs sorted by path", async () => {
  const emitter = definePlugin({
    name: "emitter",
    buildEnd: ({ output }) => {
      output.emit({ path: "daily/feed.xml", content: "<feed />" });
      output.emit({ path: "_redirects", content: "/a /b 301" });
    },
  });
  const manager = new ContentManager(memorySource(oneNote), [], {
    plugins: [emitter],
  });

  const manifest = await manager.getManifest();

  assert.deepEqual(
    manifest.generatedOutputs.map((output) => [output.path, output.owner]),
    [
      ["_redirects", "emitter"],
      ["daily/feed.xml", "emitter"],
    ],
  );
  assertGoldenJson(
    manifest.generatedOutputs,
    new URL("./__golden__/generated_outputs.json", import.meta.url),
  );
});

test("two plugins cannot claim the same generated output path", async () => {
  const first = definePlugin({
    name: "first",
    buildEnd: ({ output }) => output.emit({ path: "x.txt", content: "1" }),
  });
  const second = definePlugin({
    name: "second",
    buildEnd: ({ output }) => output.emit({ path: "x.txt", content: "2" }),
  });
  const manager = new ContentManager(memorySource(oneNote), [], {
    plugins: [first, second],
  });

  await assert.rejects(manager.getManifest(), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /Plugin "second" failed during "buildEnd"/);
    assert.match(causeMessage(error), /Duplicate generated output path/);
    assert.match(causeMessage(error), /declared by "first" and "second"/);
    return true;
  });
});

test("generated output paths are validated when emitted", async () => {
  const unsafe = definePlugin({
    name: "unsafe",
    buildEnd: ({ output }) =>
      output.emit({ path: "../escape.txt", content: "x" }),
  });
  const manager = new ContentManager(memorySource(oneNote), [], {
    plugins: [unsafe],
  });

  await assert.rejects(manager.getManifest(), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /Plugin "unsafe" failed during "buildEnd"/);
    assert.match(
      causeMessage(error),
      /must not contain "\." or "\.\." segments/,
    );
    return true;
  });
});

function causeMessage(error: unknown): string {
  const cause = (error as { cause?: unknown }).cause;
  return cause instanceof Error ? cause.message : String(cause);
}

test("manifest collects plugin assets with resolved owners", async () => {
  const assetPlugin = definePlugin({
    name: "asset-plugin",
    assets: [
      { pluginName: "", kind: "style", moduleSpecifier: "@example/theme.css" },
      {
        pluginName: "custom-owner",
        kind: "script",
        moduleSpecifier: "@example/init.js",
      },
    ],
  });
  const manager = new ContentManager(memorySource(oneNote), [], {
    plugins: [assetPlugin],
  });

  const manifest = await manager.getManifest();

  assert.deepEqual(manifest.assets, [
    {
      pluginName: "asset-plugin",
      kind: "style",
      moduleSpecifier: "@example/theme.css",
      path: "@example/theme.css",
    },
    {
      pluginName: "custom-owner",
      kind: "script",
      moduleSpecifier: "@example/init.js",
      path: "@example/init.js",
    },
  ]);
});
