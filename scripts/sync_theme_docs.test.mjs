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
} from "./sync_theme_docs.mjs";

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "riebeckite-theme-docs-"));
  const themesRoot = path.join(root, "packages", "themes");
  const docsThemesRoot = path.join(root, "docs", "docs", "themes");
  fs.mkdirSync(path.join(themesRoot, "sample"), { recursive: true });
  fs.mkdirSync(docsThemesRoot, { recursive: true });
  fs.writeFileSync(
    path.join(themesRoot, "sample", "package.json"),
    JSON.stringify({ name: "@riebeckite/theme-sample" }),
  );
  fs.writeFileSync(
    path.join(docsThemesRoot, "sample.md"),
    "# Sample\n\nEnglish source.\n\n[日本語](./sample.ja.md)\n",
  );
  fs.writeFileSync(
    path.join(docsThemesRoot, "sample.ja.md"),
    "# Sample\n\n日本語の正本。\n\n[English](./sample.md)\n",
  );
  return { root, themesRoot, docsThemesRoot };
}

function desired(fixture) {
  return buildDesiredReadmes({ ...fixture, repositoryRoot: fixture.root });
}

function sync(fixture) {
  const result = desired(fixture);
  assert.deepEqual(result.errors, []);
  const writes = planSync(result.readmes);
  for (const write of writes) fs.writeFileSync(write.readmePath, write.content);
  return writes;
}

test("preserves canonical theme docs and reflects edits in generated READMEs", () => {
  const fixture = makeFixture();
  const source = path.join(fixture.docsThemesRoot, "sample.md");
  fs.appendFileSync(source, "\nCanonical addition.\n");
  const before = fs.readFileSync(source, "utf8");
  sync(fixture);
  assert.equal(fs.readFileSync(source, "utf8"), before);
  assert.ok(
    fs
      .readFileSync(
        path.join(fixture.themesRoot, "sample", "README.md"),
        "utf8",
      )
      .includes("Canonical addition."),
  );
});

test("detects direct README edits and fails closed for missing canonical docs", () => {
  const fixture = makeFixture();
  sync(fixture);
  const english = path.join(fixture.themesRoot, "sample", "README.md");
  fs.appendFileSync(english, "manual\n");
  assert.equal(planSync(desired(fixture).readmes).length, 1);
  const japanese = path.join(fixture.themesRoot, "sample", "README_ja.md");
  const before = fs.readFileSync(japanese, "utf8");
  fs.rmSync(path.join(fixture.docsThemesRoot, "sample.ja.md"));
  const result = desired(fixture);
  assert.ok(
    result.errors.some((error) => error.includes("sample.ja.md is missing")),
  );
  assert.equal(fs.readFileSync(japanese, "utf8"), before);
});

test("rewrites theme, plugin, image, and guide links without changing fenced links", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const documentDirectory = path.join(root, "docs", "docs", "themes");
  const options = { documentDirectory, slug: "minimal" };
  assert.equal(
    rewriteTarget("./minimal.ja.md#options", options),
    "./README_ja.md#options",
  );
  assert.equal(rewriteTarget("./sakura.md", options), "../sakura/README.md");
  assert.equal(
    rewriteTarget("../plugins/search.md", options),
    "../search/README.md",
  );
  const text =
    "![Image](../assets/example.png)\n\n```md\n[日本語](./minimal.ja.md)\n```\n";
  const rewritten = rewriteDocumentLinks(text, options);
  assert.ok(
    rewritten.includes(
      "https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/assets/example.png",
    ),
  );
  assert.ok(rewritten.includes("[日本語](./minimal.ja.md)"));
});

test("is idempotent and labels generated theme READMEs", () => {
  const fixture = makeFixture();
  assert.equal(sync(fixture).length, 2);
  assert.deepEqual(sync(fixture), []);
  const readme = fs.readFileSync(
    path.join(fixture.themesRoot, "sample", "README.md"),
    "utf8",
  );
  assert.ok(readme.includes(generatedMarker("sample.md")));
  assert.equal((readme.match(/^# /gm) ?? []).length, 1);
});

test("every official theme has paired canonical docs and generated READMEs", () => {
  const { readmes, errors } = buildDesiredReadmes();
  assert.deepEqual(errors, []);
  assert.equal(readmes.length, 12);
  assert.deepEqual(planSync(readmes), []);
});
