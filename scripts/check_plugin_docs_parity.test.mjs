import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  checkReadmePair,
  checkWebsitePages,
  collectExportIdentifiers,
  collectLegacyFiles,
  collectOptionIdentifiers,
  collectPluginSlugs,
  runCheck,
} from "./check_plugin_docs_parity.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function makeTempDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "riebeckite-parity-"));
}

function writePlugin(directory, slug, english, japanese) {
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, "package.json"),
    JSON.stringify({ name: `@riebeckite/plugin-${slug}` }),
  );
  fs.writeFileSync(path.join(directory, "README.md"), english);
  fs.writeFileSync(path.join(directory, "README_ja.md"), japanese);
}

test("collects every official plugin slug in sorted order", () => {
  const slugs = collectPluginSlugs();
  assert.ok(slugs.length >= 60);
  assert.deepEqual(slugs, [...slugs].sort());
  assert.ok(slugs.includes("alias"));
  assert.ok(slugs.includes("shortcodes"));
});

test("every official plugin README pair has parity and website pages", () => {
  const { issues } = runCheck();
  assert.deepEqual(issues, []);
});

test("extracts option identifiers from option tables only", () => {
  const text = [
    "## Options",
    "",
    "| Option | Type | Default |",
    "| --- | --- | --- |",
    "| `sampleOption` | `boolean` | `false` |",
    "| `--cli-flag` | CLI | — |",
    "",
    "| Field | Use |",
    "| --- | --- |",
    "| `frontmatterField` | example |",
  ].join("\n");
  const identifiers = collectOptionIdentifiers(text);
  assert.ok(identifiers.has("sampleOption"));
  assert.ok(identifiers.has("frontmatterField"));
  assert.ok(!identifiers.has("--cli-flag"));
});

test("extracts export identifiers and ignores primitives", () => {
  const text = [
    "## Exports",
    "",
    "- `sampleFactory(options?)`",
    "- Types: `SampleOptions`, `string`, `null`",
  ].join("\n");
  const identifiers = collectExportIdentifiers(text);
  assert.ok(identifiers.has("sampleFactory"));
  assert.ok(identifiers.has("SampleOptions"));
  assert.ok(!identifiers.has("string"));
  assert.ok(!identifiers.has("null"));
});

test("detects a missing Japanese export", () => {
  const directory = makeTempDirectory();
  writePlugin(
    directory,
    "sample",
    "# @riebeckite/plugin-sample\n\n## Exports\n\n- `sampleFactory`\n- `missingHelper`\n",
    "# @riebeckite/plugin-sample\n\n## エクスポート\n\n- `sampleFactory`\n",
  );
  const issues = checkReadmePair("sample", directory);
  assert.ok(
    issues.some((issue) => issue.includes("missingHelper")),
    `expected a missing export issue, got: ${issues.join("; ")}`,
  );
});

test("detects a missing Japanese option", () => {
  const directory = makeTempDirectory();
  writePlugin(
    directory,
    "sample",
    "# @riebeckite/plugin-sample\n\n## Options\n\n| Option | Default |\n| --- | --- |\n| `sampleOption` | `false` |\n",
    "# @riebeckite/plugin-sample\n\n## オプション\n\n| 項目 | 既定値 |\n| --- | --- |\n| `otherOption` | `false` |\n",
  );
  const issues = checkReadmePair("sample", directory);
  assert.ok(issues.some((issue) => issue.includes("sampleOption")));
  assert.ok(issues.some((issue) => issue.includes("otherOption")));
});

test("detects a title that does not match package.json", () => {
  const directory = makeTempDirectory();
  writePlugin(
    directory,
    "sample",
    "# Wrong Title\n\n## Exports\n",
    "# Wrong Title\n\n## エクスポート\n",
  );
  const issues = checkReadmePair("sample", directory);
  assert.equal(issues.length, 2);
});

test("detects missing and manually maintained generated pages", () => {
  const root = makeTempDirectory();
  fs.writeFileSync(
    path.join(root, "sample.md"),
    "<!-- Generated from packages/plugins/sample/README.md. -->\n",
  );
  fs.writeFileSync(
    path.join(root, "sample.ja.md"),
    "<!-- Generated from packages/plugins/sample/README_ja.md. -->\n",
  );
  fs.writeFileSync(path.join(root, "other.ja.md"), "# Other\n\n日本語の概要\n");
  const missingBoth = checkWebsitePages("absent", root).sort();
  assert.deepEqual(missingBoth, [
    "docs/docs/plugins/absent.ja.md is missing",
    "docs/docs/plugins/absent.md is missing",
  ]);
  assert.deepEqual(checkWebsitePages("sample", root), []);
  assert.ok(
    checkWebsitePages("other", root).some((issue) =>
      issue.includes("is not a generated page"),
    ),
  );
});

test("detects legacy .en.md documentation files", () => {
  const root = makeTempDirectory();
  fs.mkdirSync(path.join(root, "nested"), { recursive: true });
  fs.writeFileSync(path.join(root, "nested", "page.en.md"), "legacy\n");
  fs.writeFileSync(path.join(root, "nested", "page.md"), "current\n");
  const found = collectLegacyFiles(root);
  assert.equal(found.length, 1);
  assert.ok(found[0].endsWith("page.en.md"));
});

test("does not report legacy files when none exist in the repository", () => {
  assert.deepEqual(collectLegacyFiles(path.join(repositoryRoot, "docs")), []);
  assert.deepEqual(
    collectLegacyFiles(path.join(repositoryRoot, "packages", "plugins")),
    [],
  );
});
