import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildDesiredReadmes,
  generatedMarker,
  planSync,
  rewriteDocumentLinks,
  rewriteTarget,
} from "./sync_plugin_docs.mjs";

function makeFixture() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "riebeckite-plugin-docs-"),
  );
  const pluginsRoot = path.join(root, "packages", "plugins");
  const docsPluginsRoot = path.join(root, "docs", "docs", "plugins");
  fs.mkdirSync(path.join(pluginsRoot, "sample"), { recursive: true });
  fs.mkdirSync(docsPluginsRoot, { recursive: true });
  fs.writeFileSync(
    path.join(pluginsRoot, "sample", "package.json"),
    JSON.stringify({ name: "@riebeckite/plugin-sample" }),
  );
  fs.writeFileSync(
    path.join(docsPluginsRoot, "sample.md"),
    "# Sample\n\nEnglish source.\n\n[日本語](./sample.ja.md)\n",
  );
  fs.writeFileSync(
    path.join(docsPluginsRoot, "sample.ja.md"),
    "# Sample\n\n日本語の正本。\n\n[English](./sample.md)\n",
  );
  return { root, pluginsRoot, docsPluginsRoot };
}

function desired(fixture) {
  return buildDesiredReadmes({
    ...fixture,
    repositoryRoot: fixture.root,
  });
}

function sync(fixture) {
  const result = desired(fixture);
  assert.deepEqual(result.errors, []);
  const writes = planSync(result.readmes);
  for (const write of writes) fs.writeFileSync(write.readmePath, write.content);
  return writes;
}

test("preserves docs edits and reflects them in generated READMEs", () => {
  const fixture = makeFixture();
  const source = path.join(fixture.docsPluginsRoot, "sample.md");
  fs.appendFileSync(source, "\nCanonical addition.\n");
  const before = fs.readFileSync(source, "utf8");
  sync(fixture);
  assert.equal(fs.readFileSync(source, "utf8"), before);
  const readme = fs.readFileSync(
    path.join(fixture.pluginsRoot, "sample", "README.md"),
    "utf8",
  );
  assert.ok(readme.includes("Canonical addition."));
  assert.ok(readme.startsWith("# @riebeckite/plugin-sample\n"));
});

test("detects direct README edits without changing canonical docs", () => {
  const fixture = makeFixture();
  sync(fixture);
  const source = path.join(fixture.docsPluginsRoot, "sample.md");
  const before = fs.readFileSync(source, "utf8");
  fs.appendFileSync(
    path.join(fixture.pluginsRoot, "sample", "README.md"),
    "manual\n",
  );
  const result = desired(fixture);
  assert.equal(result.errors.length, 0);
  assert.equal(planSync(result.readmes).length, 1);
  assert.equal(fs.readFileSync(source, "utf8"), before);
});

test("fails closed for a missing canonical source without damaging existing READMEs", () => {
  const fixture = makeFixture();
  sync(fixture);
  const readmePath = path.join(fixture.pluginsRoot, "sample", "README_ja.md");
  const before = fs.readFileSync(readmePath, "utf8");
  fs.rmSync(path.join(fixture.docsPluginsRoot, "sample.ja.md"));
  const result = desired(fixture);
  assert.ok(
    result.errors.some((error) => error.includes("sample.ja.md is missing")),
  );
  assert.equal(fs.readFileSync(readmePath, "utf8"), before);
});

test("rewrites documentation links and leaves fenced links untouched", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const documentDirectory = path.join(root, "docs", "docs", "plugins");
  const options = {
    documentDirectory,
    docsPluginsDirectory: documentDirectory,
    repositoryDirectory: root,
    slug: "shortcodes",
  };
  assert.equal(
    rewriteTarget("./shortcodes.ja.md#options", options),
    "./README_ja.md#options",
  );
  assert.equal(
    rewriteTarget("./code-enhance.md", options),
    "../code-enhance/README.md",
  );
  assert.equal(
    rewriteTarget("../reference/plugin-api.md", options),
    "https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md",
  );
  assert.equal(
    rewriteTarget("https://example.com/image.png", options),
    "https://example.com/image.png",
  );
  const text =
    "![Image](../assets/example.png)\n\n```md\n[日本語](./shortcodes.ja.md)\n```\n";
  const rewritten = rewriteDocumentLinks(text, options);
  assert.ok(
    rewritten.includes(
      "https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/assets/example.png",
    ),
  );
  assert.ok(rewritten.includes("[日本語](./shortcodes.ja.md)"));
});

test("is idempotent and labels generated READMEs", () => {
  const fixture = makeFixture();
  assert.equal(sync(fixture).length, 2);
  assert.deepEqual(sync(fixture), []);
  const readme = fs.readFileSync(
    path.join(fixture.pluginsRoot, "sample", "README.md"),
    "utf8",
  );
  assert.ok(readme.includes(generatedMarker("sample.md")));
  assert.equal((readme.match(/^# /gm) ?? []).length, 1);
});

test("every official plugin has paired canonical docs and generated READMEs", () => {
  const { readmes, errors } = buildDesiredReadmes();
  assert.deepEqual(errors, []);
  assert.equal(readmes.length, 140);
  assert.deepEqual(planSync(readmes), []);
});
