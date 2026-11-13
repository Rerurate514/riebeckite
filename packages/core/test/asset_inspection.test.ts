import assert from "node:assert/strict";
import { test } from "node:test";
import { createContentManifest } from "@riebeckite/core";
import type {
  ContentManifestEntry,
  ContentSource,
  ContentSourceEntry,
} from "../index.js";
import { inspectContentAssets } from "../index.js";

test("inspects asset usage, formats, duplicates, and optimization candidates", async () => {
  const files = new Map<string, Uint8Array>([
    ["a.png", new TextEncoder().encode("same")],
    ["b.png", new TextEncoder().encode("same")],
    ["c.jpg", new Uint8Array(200 * 1024)],
    ["d.png", new Uint8Array(100 * 1024)],
    ["e.bin", new TextEncoder().encode("unused")],
    ["post.md", new TextEncoder().encode("![a](a.png)\nsee d.png")],
    ["draft.md", new TextEncoder().encode("![c](c.jpg)")],
  ]);
  const source: ContentSource = {
    async scan() {
      return [...files.keys()].map((path) => ({ path }));
    },
    async read(entry: ContentSourceEntry) {
      const value = files.get(entry.path);
      if (!value) throw new Error(`Missing ${entry.path}`);
      return value;
    },
  };
  const publicEntry = entry("post", true);
  const draftEntry = entry("draft", false);
  const manifest = createContentManifest({
    byAsset: new Map([
      ["a.png", [publicEntry]],
      ["c.jpg", [draftEntry]],
    ]),
  });

  const report = await inspectContentAssets(manifest, source, {
    largeAssetBytes: 150 * 1024,
  });

  assert.equal(report.totals.assets, 5);
  assert.equal(report.totals.used, 1);
  assert.equal(report.totals.possiblyUnused, 2);
  assert.equal(report.totals.unused, 2);
  assert.deepEqual(
    report.assets.map((asset) => [asset.path, asset.usage]),
    [
      ["a.png", "used"],
      ["b.png", "unused"],
      ["c.jpg", "possibly-unused"],
      ["d.png", "possibly-unused"],
      ["e.bin", "unused"],
    ],
  );
  assert.equal(report.duplicates.length, 1);
  assert.deepEqual(report.duplicates[0]?.paths, ["a.png", "b.png"]);
  assert.equal(report.totals.duplicateBytes, 4);
  assert.ok(
    report.optimizations.some(
      (item) => item.path === "c.jpg" && item.kind === "large",
    ),
  );
  assert.ok(
    report.optimizations.some(
      (item) => item.path === "d.png" && item.kind === "modern-format",
    ),
  );
  assert.deepEqual(
    report.formats.map((format) => [
      format.extension,
      format.kind,
      format.count,
    ]),
    [
      ["bin", "asset", 1],
      ["jpg", "image", 1],
      ["png", "image", 3],
    ],
  );
});

test("uses content format dependencies for asset usage", async () => {
  const files = new Map<string, Uint8Array>([
    ["page.mdx", new TextEncoder().encode('import { Card } from "./Card"\n')],
    [
      "draft.mdx",
      new TextEncoder().encode('import { Draft } from "./Draft"\n'),
    ],
    ["Card.tsx", new TextEncoder().encode("export const Card = () => null;\n")],
    [
      "Draft.tsx",
      new TextEncoder().encode("export const Draft = () => null;\n"),
    ],
    [
      "Unused.tsx",
      new TextEncoder().encode("export const Unused = () => null;\n"),
    ],
  ]);
  const source: ContentSource = {
    async scan() {
      return [...files.keys()].map((path) => ({ path }));
    },
    async read(entry: ContentSourceEntry) {
      const value = files.get(entry.path);
      if (!value) throw new Error(`Missing ${entry.path}`);
      return value;
    },
  };
  const manifest = createContentManifest({
    entries: [
      { ...entry("page", true), sourcePath: "page.mdx" },
      { ...entry("draft", false), sourcePath: "draft.mdx" },
    ],
  });

  const report = await inspectContentAssets(manifest, source, {
    isContentPath: (path) => !path.endsWith(".tsx"),
    contentDependencies: new Map([
      ["page.mdx", ["Card.tsx"]],
      ["draft.mdx", ["Draft.tsx"]],
    ]),
  });

  assert.deepEqual(
    report.assets.map((asset) => [asset.path, asset.usage]),
    [
      ["Card.tsx", "used"],
      ["Draft.tsx", "possibly-unused"],
      ["Unused.tsx", "unused"],
    ],
  );
  assert.deepEqual(report.assets[0]?.references, ["page"]);
});

function entry(slug: string, routable: boolean): ContentManifestEntry {
  return {
    slug,
    publishing: { visibility: routable ? "public" : "draft", routable },
  } as ContentManifestEntry;
}
