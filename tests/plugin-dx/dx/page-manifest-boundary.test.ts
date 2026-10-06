import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentManifest,
  type ContentSource,
  definePlugin,
  resolveConfig,
} from "@riebeckite/core";

function source(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

const files = {
  "index.md": "---\ntitle: Home\npublish: true\n---\n# Home",
  "alpha.md": "---\ntitle: Alpha\npublish: true\n---\n# Alpha",
  "unlisted.md": "---\ntitle: Unlisted\nvisibility: unlisted\n---\n# Unlisted",
  "draft.md": "---\ntitle: Draft\nvisibility: draft\n---\n# Draft",
  "scheduled.md":
    '---\ntitle: Scheduled\npublishAt: "2999-01-01T00:00:00.000Z"\n---\n# Scheduled',
};

const config = resolveConfig({
  site: { title: "Test" },
  content: { filters: { publishStrategy: "explicit" } },
});

test("page resolvers receive the full manifest, not a filtered one", async () => {
  let captured: ContentManifest | undefined;
  const probe = definePlugin({
    name: "probe",
    pageTypes: [
      {
        id: "probe",
        paths: ["/probe"],
        resolve: ({ pathname, manifest }) => {
          captured = manifest;
          return { type: "probe", pathname, body: "probe" };
        },
      },
    ],
  });
  const manager = new ContentManager(source(files), [], {
    config,
    plugins: [probe],
  });

  const page = await manager.resolvePage("/probe");
  assert.ok(page);
  assert.ok(captured);

  const slugs = (entries: readonly { slug: string }[]) =>
    entries.map((entry) => entry.slug).sort();

  assert.deepEqual(slugs(captured.entries), [
    "alpha",
    "draft",
    "index",
    "scheduled",
    "unlisted",
  ]);
  assert.deepEqual(slugs(captured.publicEntries), [
    "alpha",
    "index",
    "unlisted",
  ]);
  assert.deepEqual(slugs(captured.discoverableEntries), ["alpha", "index"]);

  for (const entry of captured.discoverableEntries) {
    assert.equal(entry.publishing.discoverable, true);
    assert.equal(entry.publishing.visibility, "public");
  }
  for (const slug of ["draft", "scheduled"]) {
    const entry = captured.entries.find((candidate) => candidate.slug === slug);
    assert.ok(entry);
    assert.equal(entry.publishing.routable, false);
    assert.equal(entry.publishing.discoverable, false);
  }
});
