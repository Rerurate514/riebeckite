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

  assert.deepEqual(manifest.entries.map((entry) => entry.slug).sort(), [
    "index",
    "public",
    "secret",
  ]);
  assert.deepEqual(manifest.publicEntries.map((entry) => entry.slug).sort(), [
    "index",
    "public",
  ]);
  assert.deepEqual([...manifest.publicRedirects.keys()].sort(), [
    "/old-index",
    "/old-public",
  ]);
});

test("manifest separates routable and discoverable publishing views", async () => {
  const config = resolveConfig({
    site: { title: "Test" },
    content: { filters: { publishStrategy: "explicit" } },
    plugins: [redirectPlugin],
  });
  const manager = new ContentManager(
    memorySource({
      "public.md": "---\ntitle: Public\nvisibility: public\n---\n\n# Public\n",
      "unlisted.md":
        "---\ntitle: Unlisted\nvisibility: unlisted\n---\n\n# Unlisted\n",
      "draft.md": "---\ntitle: Draft\nvisibility: draft\n---\n\n# Draft\n",
    }),
    [],
    { config },
  );

  const manifest = await manager.getManifest();

  assert.deepEqual(manifest.entries.map((entry) => entry.slug).sort(), [
    "draft",
    "public",
    "unlisted",
  ]);
  assert.deepEqual(manifest.publicEntries.map((entry) => entry.slug).sort(), [
    "public",
    "unlisted",
  ]);
  assert.deepEqual(
    manifest.discoverableEntries.map((entry) => entry.slug),
    ["public"],
  );
  assert.equal(manifest.byPermalink.get("/draft")?.slug, "draft");
  assert.equal(manifest.byRoutablePermalink.get("/draft"), undefined);
  assert.equal(manifest.byRoutablePermalink.get("/unlisted")?.slug, "unlisted");
  assert.deepEqual([...manifest.publicRedirects.keys()].sort(), [
    "/old-public",
    "/old-unlisted",
  ]);
});

test("scheduled publishing is resolved from deterministic build time", async () => {
  const config = resolveConfig({
    site: { title: "Test" },
    content: { filters: { publishStrategy: "explicit" } },
  });
  const files = {
    "past.md":
      "---\ntitle: Past\npublishAt: 2024-01-01T00:00:00.000Z\n---\n\n# Past\n",
    "future.md":
      "---\ntitle: Future\npublishAt: 2024-01-03T00:00:00.000Z\n---\n\n# Future\n",
  };
  const manager = new ContentManager(memorySource(files), [], {
    config,
    publishingBuildTime: "2024-01-02T00:00:00.000Z",
  });

  const manifest = await manager.getManifest();

  assert.deepEqual(
    manifest.publicEntries.map((entry) => entry.slug),
    ["past"],
  );
  assert.deepEqual(
    manifest.discoverableEntries.map((entry) => entry.slug),
    ["past"],
  );
  assert.equal(
    manifest.bySlug.get("future")?.publishing.visibility,
    "scheduled",
  );
  assert.equal(manifest.byRoutablePermalink.get("/future"), undefined);

  const laterManager = new ContentManager(memorySource(files), [], {
    config,
    publishingBuildTime: "2024-01-04T00:00:00.000Z",
  });
  const laterManifest = await laterManager.getManifest();
  assert.deepEqual(
    laterManifest.publicEntries.map((entry) => entry.slug),
    ["past", "future"],
  );
});

test("malformed publishing fields fail closed", async () => {
  const config = resolveConfig({ site: { title: "Test" } });
  const badVisibility = new ContentManager(
    memorySource({
      "note.md": "---\ntitle: Note\nvisibility: hidden\n---\n\n# Note\n",
    }),
    [],
    { config },
  );
  await assert.rejects(
    badVisibility.getManifest(),
    /Invalid content visibility/,
  );

  const badDate = new ContentManager(
    memorySource({
      "note.md": "---\ntitle: Note\npublishAt: not-a-date\n---\n\n# Note\n",
    }),
    [],
    { config },
  );
  await assert.rejects(badDate.getManifest(), /Invalid publishAt/);
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
  assert.deepEqual(manifest.publicEntries.map((entry) => entry.slug).sort(), [
    "note",
  ]);
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

test("content IDs stay attached to the canonical entry across redirects", async () => {
  const config = resolveConfig({
    site: { title: "Test" },
    plugins: [redirectPlugin],
  });
  const manager = new ContentManager(
    memorySource({
      "note.md":
        "---\nid: note-7f4e9b\naliases: [Previous note]\n---\n\n# Note\n",
      "legacy.md": "---\nuid: legacy-42\n---\n\n# Legacy\n",
      "plain.md": "# Plain\n",
    }),
    [],
    { config },
  );

  const manifest = await manager.getManifest();

  assert.equal(manifest.bySlug.get("note")?.contentId, "note-7f4e9b");
  assert.equal(manifest.byPermalink.get("/note")?.contentId, "note-7f4e9b");
  assert.equal(manifest.redirects.get("/old-note")?.slug, "note");
  assert.equal(manifest.byContentId.get("note-7f4e9b")?.slug, "note");
  assert.equal(manifest.byContentId.get("legacy-42")?.slug, "legacy");
  assert.equal(manifest.bySlug.get("plain")?.contentId, undefined);
});

test("content IDs reject ambiguous or invalid frontmatter", async () => {
  const manager = new ContentManager(
    memorySource({
      "first.md": "---\nid: shared\n---\n\n# First\n",
      "second.md": "---\nid: shared\n---\n\n# Second\n",
    }),
  );
  await assert.rejects(manager.getManifest(), /Duplicate content ID/);

  const conflicting = new ContentManager(
    memorySource({
      "note.md": "---\nid: current\nuid: legacy\n---\n\n# Note\n",
    }),
  );
  await assert.rejects(conflicting.getManifest(), /must have the same value/);

  const invalid = new ContentManager(
    memorySource({
      "note.md": "---\nid: 42\n---\n\n# Note\n",
    }),
  );
  await assert.rejects(invalid.getManifest(), /must be a string/);
});
