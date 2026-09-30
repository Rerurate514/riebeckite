import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeGeneratedOutputPath } from "../src/types/generated_output.js";

test("normalizeGeneratedOutputPath keeps relative paths and fixes separators", () => {
  assert.equal(normalizeGeneratedOutputPath("_redirects"), "_redirects");
  assert.equal(
    normalizeGeneratedOutputPath("daily/feed.xml"),
    "daily/feed.xml",
  );
  assert.equal(
    normalizeGeneratedOutputPath("daily\\feed.xml"),
    "daily/feed.xml",
  );
  assert.equal(normalizeGeneratedOutputPath("a//b/"), "a/b");
});

test("normalizeGeneratedOutputPath rejects traversal and absolute paths", () => {
  for (const unsafe of [
    "",
    "/etc/passwd",
    "../escape.txt",
    "daily/../../escape.txt",
    "C:/windows/system32",
    "~/.ssh/id_rsa",
    "\0",
    "a\0b",
  ]) {
    assert.throws(
      () => normalizeGeneratedOutputPath(unsafe),
      `expected "${unsafe}" to be rejected`,
    );
  }
});

test("normalizeGeneratedOutputPath rejects reserved namespaces", () => {
  for (const reserved of [
    "assets",
    "assets/logo.svg",
    ".riebeckite",
    ".riebeckite/cache/x.json",
  ]) {
    assert.throws(
      () => normalizeGeneratedOutputPath(reserved),
      `expected "${reserved}" to be rejected`,
    );
  }
});
