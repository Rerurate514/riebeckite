import assert from "node:assert/strict";
import { test } from "node:test";
import { GeneratedOutputRegistry } from "../src/plugin/generated_output_registry.js";
import {
  createUnavailableGeneratedOutputSink,
  normalizeContentAssetOutputPath,
  normalizeGeneratedOutputPath,
} from "../src/types/generated_output.js";

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
    "assets/attachments",
    "assets/attachments/notes/diagram.bin",
    ".riebeckite",
    ".riebeckite/cache/x.json",
  ]) {
    assert.throws(
      () => normalizeGeneratedOutputPath(reserved),
      `expected "${reserved}" to be rejected`,
    );
  }
});

test("normalizeContentAssetOutputPath keeps content asset paths but rejects unsafe namespaces", () => {
  assert.equal(
    normalizeContentAssetOutputPath("assets/riebeckite-logo.png"),
    "assets/riebeckite-logo.png",
  );
  assert.equal(
    normalizeContentAssetOutputPath("assets\\logo\\horizontal.png"),
    "assets/logo/horizontal.png",
  );
  for (const unsafe of [
    "",
    "/etc/passwd",
    "../escape.txt",
    "assets/../../escape.txt",
    "C:/windows/system32",
    "~/.ssh/id_rsa",
    "\0",
    "assets/attachments",
    "assets/attachments/notes/diagram.bin",
    ".riebeckite",
    ".riebeckite/cache/x.json",
  ]) {
    assert.throws(
      () => normalizeContentAssetOutputPath(unsafe),
      `expected "${unsafe}" to be rejected`,
    );
  }
});

test("emitAsset accepts content asset paths that emit keeps rejecting", () => {
  const registry = new GeneratedOutputRegistry();
  const sink = registry.sinkFor("obsidian-markdown");

  sink.emitAsset({ path: "assets/riebeckite-logo.png", content: "image" });
  sink.emit({ path: "daily/feed.xml", content: "<feed />" });

  assert.deepEqual(
    registry.all().map((output) => output.path),
    ["assets/riebeckite-logo.png", "daily/feed.xml"],
  );
  assert.throws(
    () => sink.emit({ path: "assets/riebeckite-logo.png", content: "other" }),
    /static assets namespace/,
  );
});

test("content assets cannot claim the same path", () => {
  const registry = new GeneratedOutputRegistry();
  registry.sinkFor("obsidian-markdown").emitAsset({
    path: "assets/logo.png",
    content: "first",
  });

  assert.throws(
    () =>
      registry.sinkFor("other-plugin").emitAsset({
        path: "assets/logo.png",
        content: "second",
      }),
    /Duplicate generated output path "assets\/logo.png"/,
  );
  assert.equal(registry.all().length, 1);
});

test("plugin generated outputs cannot claim the same path", () => {
  const registry = new GeneratedOutputRegistry();
  registry.sinkFor("deploy").emit({ path: "_redirects", content: "first" });

  assert.throws(
    () =>
      registry
        .sinkFor("other-plugin")
        .emit({ path: "_redirects", content: "second" }),
    /Duplicate generated output path "_redirects"/,
  );
  assert.equal(registry.all().length, 1);
});

test("the unavailable output sink rejects content assets too", () => {
  const sink = createUnavailableGeneratedOutputSink();
  assert.throws(
    () => sink.emitAsset({ path: "assets/logo.png", content: "image" }),
    /available only during a build lifecycle/,
  );
});
