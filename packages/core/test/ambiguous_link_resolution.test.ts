import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { ContentManager } from "../src/content/content_manager.js";
import type { ContentSource } from "../src/content/content_source.js";
import type { ContentManifest } from "../src/types/content_manifest.js";
import type { ResolvedRiebeckiteConfig } from "../src/types/resolved_riebeckite_config.js";

function memorySource(
  files: Record<string, string>,
  order: string[] = Object.keys(files),
): ContentSource {
  return {
    async scan() {
      return order.map((filePath) => ({ path: filePath }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

function testConfig(directory: string): ResolvedRiebeckiteConfig {
  return {
    buildDirectory: directory,
    site: {
      title: "Test",
      description: "",
      author: "",
      baseUrl: "http://test",
      locale: "en",
      twitterSite: "",
      defaultOgImage: "",
      feed: { title: "", description: "", language: "en" },
    },
    content: {
      directory: "/test",
      exclude: [],
      filters: { publishStrategy: "explicit" },
    },
    theme: {
      name: "test",
      colorMode: "system",
      typography: "system",
      articleLayout: "article",
      tokens: {},
      attributes: {},
      userCss: [],
      styles: [],
    },
    plugins: [],
    cache: { enabled: false, directory: path.join(directory, "cache") },
  };
}

function managerFor(
  files: Record<string, string>,
  order?: string[],
  config?: ResolvedRiebeckiteConfig,
): ContentManager {
  return new ContentManager(memorySource(files, order), [], {
    config,
    plugins: config?.plugins,
  });
}

function linksOf(manifest: ContentManifest, slug: string) {
  return manifest.bySlug.get(slug)?.links;
}

const publicFrontmatter = "---\npublish: true\n---\n\n";

test("duplicate basename is ambiguous and independent of scan order", async () => {
  const files = {
    "a.md": `${publicFrontmatter}[[dup]]`,
    "x/dup.md": `${publicFrontmatter}# X`,
    "y/dup.md": `${publicFrontmatter}# Y`,
  };

  const forward = await managerFor(files, [
    "a.md",
    "x/dup.md",
    "y/dup.md",
  ]).getManifest();
  const reverse = await managerFor(files, [
    "y/dup.md",
    "x/dup.md",
    "a.md",
  ]).getManifest();

  for (const manifest of [forward, reverse]) {
    assert.deepEqual(linksOf(manifest, "a"), [
      { raw: "dup", slug: null, kind: "unresolved", embed: false },
    ]);
    assert.equal(manifest.contentIndex.has("dup"), false);
    assert.deepEqual(manifest.contentIndexAmbiguities?.get("dup"), [
      "x/dup",
      "y/dup",
    ]);
  }
});

test("an explicit path resolves even when the basename is duplicated", async () => {
  const files = {
    "a.md": `${publicFrontmatter}[[x/dup]] [[y/dup]]`,
    "x/dup.md": `${publicFrontmatter}# X`,
    "y/dup.md": `${publicFrontmatter}# Y`,
  };

  const manifest = await managerFor(files).getManifest();

  assert.deepEqual(linksOf(manifest, "a"), [
    { raw: "x/dup", slug: "x/dup", kind: "note", embed: false },
    { raw: "y/dup", slug: "y/dup", kind: "note", embed: false },
  ]);
  assert.equal(manifest.contentIndexAmbiguities?.has("x/dup"), false);
});

test("a duplicated alias is ambiguous and independent of scan order", async () => {
  const files = {
    "a.md": `${publicFrontmatter}[[shared]]`,
    "x/note.md": `---\npublish: true\naliases: [shared]\n---\n\n# X`,
    "y/note.md": `---\npublish: true\naliases: [shared]\n---\n\n# Y`,
  };

  const forward = await managerFor(files, [
    "a.md",
    "x/note.md",
    "y/note.md",
  ]).getManifest();
  const reverse = await managerFor(files, [
    "y/note.md",
    "x/note.md",
    "a.md",
  ]).getManifest();

  for (const manifest of [forward, reverse]) {
    assert.deepEqual(linksOf(manifest, "a"), [
      { raw: "shared", slug: null, kind: "unresolved", embed: false },
    ]);
    assert.deepEqual(manifest.contentIndexAmbiguities?.get("shared"), [
      "x/note",
      "y/note",
    ]);
  }
});

test("a duplicated attachment basename is ambiguous but an explicit path is not", async () => {
  const files = {
    "a.md": `${publicFrontmatter}![[photo.png]]\n\n![[img/x/photo.png]]`,
    "img/x/photo.png": "",
    "img/y/photo.png": "",
  };

  const manifest = await managerFor(files).getManifest();

  assert.deepEqual(linksOf(manifest, "a"), [
    { raw: "photo.png", slug: null, kind: "unresolved", embed: true },
    {
      raw: "img/x/photo.png",
      slug: "img/x/photo.png",
      kind: "image",
      embed: true,
    },
  ]);
  assert.deepEqual(manifest.contentIndexAmbiguities?.get("photo.png"), [
    "img/x/photo.png",
    "img/y/photo.png",
  ]);
});

test("wikilinks are location independent rather than source-relative", async () => {
  const files = {
    "a/note.md": `${publicFrontmatter}[[dup]]`,
    "a/dup.md": `${publicFrontmatter}# A`,
    "b/dup.md": `${publicFrontmatter}# B`,
  };

  const manifest = await managerFor(files).getManifest();

  assert.deepEqual(linksOf(manifest, "a/note"), [
    { raw: "dup", slug: null, kind: "unresolved", embed: false },
  ]);
  assert.deepEqual(manifest.contentIndexAmbiguities?.get("dup"), [
    "a/dup",
    "b/dup",
  ]);
});

test("on-demand, cold, and incremental builds agree on ambiguous links", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-ambiguous-parity-"),
  );
  const config = testConfig(directory);
  const files = {
    "a.md": `${publicFrontmatter}[[dup]]`,
    "x/dup.md": `${publicFrontmatter}# X`,
    "y/dup.md": `${publicFrontmatter}# Y`,
  };

  const onDemand = managerFor(files, undefined, config);
  const cold = managerFor(files, undefined, config);
  const incremental = managerFor(files, undefined, config);
  try {
    const onDemandManifest = await onDemand.getManifest();
    const coldManifest = await cold.build({ incremental: false });
    const incrementalManifest = await incremental.build({ incremental: true });

    const expected = [
      { raw: "dup", slug: null, kind: "unresolved", embed: false },
    ];
    const expectedAmbiguities = ["x/dup", "y/dup"];
    for (const manifest of [
      onDemandManifest,
      coldManifest,
      incrementalManifest,
    ]) {
      assert.deepEqual(linksOf(manifest, "a"), expected);
      assert.deepEqual(
        manifest.contentIndexAmbiguities?.get("dup"),
        expectedAmbiguities,
      );
    }
  } finally {
    await onDemand.dispose();
    await cold.dispose();
    await incremental.dispose();
  }
});

test("a public note does not silently pick between a public and a private duplicate", async () => {
  const files = {
    "a.md": `${publicFrontmatter}[[dup]]`,
    "x/dup.md": `${publicFrontmatter}# Public`,
    "y/dup.md": "---\npublish: false\n---\n\n# Private",
  };

  const manifest = await managerFor(files).getManifest();

  assert.deepEqual(linksOf(manifest, "a"), [
    { raw: "dup", slug: null, kind: "unresolved", embed: false },
  ]);
  assert.deepEqual(manifest.contentIndexAmbiguities?.get("dup"), [
    "x/dup",
    "y/dup",
  ]);
  assert.deepEqual(
    manifest.publicEntries.map((entry) => entry.slug),
    ["a", "x/dup"],
  );
});

test("a unique private target still resolves so the boundary diagnostic can report it", async () => {
  const files = {
    "a.md": `${publicFrontmatter}[[secret]]`,
    "secret.md": "---\npublish: false\n---\n\n# Secret",
  };

  const manifest = await managerFor(files).getManifest();

  assert.deepEqual(linksOf(manifest, "a"), [
    { raw: "secret", slug: "secret", kind: "note", embed: false },
  ]);
  assert.deepEqual(
    manifest.publicEntries.map((entry) => entry.slug),
    ["a"],
  );
});
