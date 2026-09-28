import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "../src/config.js";
import { ContentManager } from "../src/content/content_manager.js";
import type {
  ContentSource,
  ContentSourceEntry,
} from "../src/content/content_source.js";
import { definePlugin } from "../src/types/plugin.js";

function memorySource(files: Record<string, string>): ContentSource {
  const entries: ContentSourceEntry[] = Object.keys(files).map((path) => ({
    path,
  }));
  return {
    async scan() {
      return entries;
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

const redirectPlugin = definePlugin({
  name: "test-redirects",
  resolveContentLocations: ({ entries }) =>
    entries.map((entry) => ({
      slug: entry.slug,
      permalink: entry.slug === "index" ? "/" : `/${entry.slug}`,
      redirects: [{ path: `/old-${entry.slug}`, status: 308 as const }],
    })),
});

test("manifest exposes a public-only view without stripping raw entries", async () => {
  const config = resolveConfig({
    site: { title: "Test" },
    content: { filters: { publishStrategy: "explicit" } },
    plugins: [redirectPlugin],
  });
  const manager = new ContentManager(
    memorySource({
      "index.md": "---\ntitle: Home\npublish: true\n---\n\n# Home\n",
      "public.md": "---\ntitle: Public\npublish: true\n---\n\n# Public\n",
      "secret.md": "---\ntitle: Secret\npublish: false\n---\n\n# Secret\n",
    }),
    [],
    { config },
  );

  const manifest = await manager.getManifest();

  assert.deepEqual(
    manifest.entries.map((entry) => entry.slug).sort(),
    ["index", "public", "secret"],
  );
  assert.deepEqual(
    manifest.publicEntries.map((entry) => entry.slug).sort(),
    ["index", "public"],
  );
  assert.deepEqual(
    [...manifest.publicRedirects.keys()].sort(),
    ["/old-index", "/old-public"],
  );
});

test("selective publish strategy keeps non-private notes and drops private ones", async () => {
  const config = resolveConfig({
    site: { title: "Test" },
    content: { filters: { publishStrategy: "selective" } },
  });
  const manager = new ContentManager(
    memorySource({
      "draft.md": "---\ntitle: Draft\ndraft: true\n---\n\n# Draft\n",
      "private.md": "---\ntitle: Private\nprivate: true\n---\n\n# Private\n",
      "note.md": "---\ntitle: Note\n---\n\n# Note\n",
    }),
    [],
    { config },
  );

  const manifest = await manager.getManifest();
  assert.deepEqual(
    manifest.publicEntries.map((entry) => entry.slug).sort(),
    ["note"],
  );
});

test("default publish strategy is explicit (deny by default)", async () => {
  const config = resolveConfig({ site: { title: "Test" } });
  const manager = new ContentManager(
    memorySource({
      "unmarked.md": "---\ntitle: Unmarked\n---\n\n# Unmarked\n",
      "public.md": "---\ntitle: Public\npublish: true\n---\n\n# Public\n",
    }),
    [],
    { config },
  );

  const manifest = await manager.getManifest();
  assert.deepEqual(
    manifest.publicEntries.map((entry) => entry.slug),
    ["public"],
  );
});
