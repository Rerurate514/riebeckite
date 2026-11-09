import assert from "node:assert/strict";
import { test } from "node:test";
import {
  extractContentTags,
  extractFrontmatterAliases,
} from "../src/content/content_metadata.ts";

test("reads a singular inline alias", () => {
  assert.deepEqual(extractFrontmatterAliases("---\nalias: Old Name\n---\n"), [
    "Old Name",
  ]);
});

test("reads a plural inline alias", () => {
  assert.deepEqual(extractFrontmatterAliases("---\naliases: Old Name\n---\n"), [
    "Old Name",
  ]);
});

test("reads an inline alias list", () => {
  assert.deepEqual(
    extractFrontmatterAliases("---\nalias: [Old Name, Legacy]\n---\n"),
    ["Old Name", "Legacy"],
  );
});

test("reads singular and plural block alias lists", () => {
  assert.deepEqual(
    extractFrontmatterAliases("---\nalias:\n  - Old Name\n  - Legacy\n---\n"),
    ["Old Name", "Legacy"],
  );
  assert.deepEqual(
    extractFrontmatterAliases("---\naliases:\n  - Old Name\n  - Legacy\n---\n"),
    ["Old Name", "Legacy"],
  );
});

test("strips quotes from alias values", () => {
  assert.deepEqual(extractFrontmatterAliases("---\nalias: 'Old Name'\n---\n"), [
    "Old Name",
  ]);
  assert.deepEqual(
    extractFrontmatterAliases('---\naliases:\n  - "Old Name"\n---\n'),
    ["Old Name"],
  );
});

test("deduplicates repeated aliases", () => {
  assert.deepEqual(
    extractFrontmatterAliases("---\nalias: [Twice, Twice]\n---\n"),
    ["Twice"],
  );
});

test("returns an empty list without frontmatter", () => {
  assert.deepEqual(extractFrontmatterAliases("# No frontmatter\n"), []);
});

test("extracts inline tags from prose", () => {
  assert.deepEqual(extractContentTags("Text with #alpha and #beta/gamma."), [
    "alpha",
    "beta/gamma",
  ]);
});

test("ignores tags in code, links, wikilinks, and HTML", () => {
  const markdown = [
    "```",
    "FROM #fenced",
    "```",
    "",
    "Inline `#inline` and [label](#anchor) and [[#fragment]].",
    'Raw <a href="#attribute">html</a>.',
    "",
    "Keep #real.",
  ].join("\n");

  assert.deepEqual(extractContentTags(markdown), ["real"]);
});

test("ignores frontmatter tags", () => {
  assert.deepEqual(extractContentTags("---\ntags: [#secret]\n---\n\n#public"), [
    "public",
  ]);
});
