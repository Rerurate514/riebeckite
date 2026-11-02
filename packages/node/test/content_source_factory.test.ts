import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createContentSource } from "../src/content_source_factory.js";

test("prefers a configured content source", () => {
  const source = { scan: async () => [], read: async () => new Uint8Array() };
  assert.equal(createContentSource({ source, directory: "/ignored" }), source);
});

test("builds a filesystem source with the configured directory and excludes", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "riebeckite-source-"));
  try {
    fs.mkdirSync(path.join(root, "drafts"));
    fs.writeFileSync(path.join(root, "published.md"), "# Published\n");
    fs.writeFileSync(path.join(root, "drafts", "hidden.md"), "# Hidden\n");
    const source = createContentSource({
      directory: root,
      exclude: ["drafts/**"],
    });
    const entries = await source.scan();
    assert.deepEqual(
      entries.map((entry) => entry.path),
      ["published.md"],
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("accepts a directory override for project-relative resolution", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "riebeckite-source-"));
  try {
    const source = createContentSource({ directory: "content" }, root);
    assert.equal(source.constructor.name, "FileSystemContentSource");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
