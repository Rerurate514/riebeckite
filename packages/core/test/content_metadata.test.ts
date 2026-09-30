import assert from "node:assert/strict";
import { test } from "node:test";
import { extractFrontmatterAliases } from "../src/content/content_metadata.ts";

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
