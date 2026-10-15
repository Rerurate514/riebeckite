import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  createPublicContentView,
} from "../index.js";

const files = {
  "public.md": [
    "---",
    "title: Public title",
    "visibility: public",
    "aliases: [Public alias]",
    "tags: [shared]",
    "series: safe-series",
    "---",
    "",
    "[unlisted](unlisted.md)",
    "[draft](draft.md)",
  ].join("\n"),
  "unlisted.md": [
    "---",
    "title: Unlisted title",
    "visibility: unlisted",
    "aliases: [Unlisted alias]",
    "tags: [shared]",
    "---",
    "",
    "[public](public.md)",
  ].join("\n"),
  "draft.md": [
    "---",
    "title: Draft secret title",
    "visibility: draft",
    "aliases: [Draft secret alias]",
    "tags: [shared]",
    "series: secret-series",
    "---",
    "",
    "[public](public.md)",
  ].join("\n"),
};

test("PublicContentView filters publication state, indexes, and relationships", async () => {
  const manager = new ContentManager(memorySource(files));
  const manifest = await manager.getManifest();
  const view = createPublicContentView(manifest);

  assert.deepEqual(
    view.discoverableEntries.map((entry) => entry.slug),
    ["public"],
  );
  assert.deepEqual(view.routableEntries.map((entry) => entry.slug).sort(), [
    "public",
    "unlisted",
  ]);
  assert.equal(view.findDiscoverableBySlug("unlisted"), undefined);
  assert.equal(view.findRoutableBySlug("unlisted")?.title, "Unlisted title");
  assert.equal(view.findRoutableBySlug("draft"), undefined);
  assert.equal(view.findDiscoverableBySlug("draft"), undefined);
  assert.deepEqual(view.findRoutableByAlias("Draft secret alias"), []);
  assert.deepEqual(
    view.getDiscoverableEntriesByTag("shared").map((entry) => entry.slug),
    ["public"],
  );
  assert.deepEqual(view.getDiscoverableOutgoing("public"), []);
  assert.deepEqual(view.getDiscoverableIncoming("public"), []);
  assert.deepEqual(view.getDiscoverableNeighbors("public"), []);
  assert.equal(
    view
      .findRoutableBySlug("public")
      ?.links.some((link) => link.slug === "draft"),
    false,
  );
  assert.doesNotMatch(JSON.stringify(view), /Draft secret|draft/);

  await manager.dispose();
});

test("PublicContentView copies and freezes routable data", async () => {
  const manager = new ContentManager(memorySource(files));
  const manifest = await manager.getManifest();
  const view = createPublicContentView(manifest);
  const original = manifest.bySlug.get("public");

  assert.ok(original);
  original.title = "Changed after view creation";
  original.tags.push("changed");

  assert.equal(view.findRoutableBySlug("public")?.title, "Public title");
  assert.deepEqual(view.getDiscoverableEntriesByTag("changed"), []);
  assert.equal(Object.isFrozen(view.routableEntries), true);
  const publicEntry = view.findRoutableBySlug("public");
  assert.ok(publicEntry);
  assert.equal(Object.isFrozen(publicEntry), true);

  const nextView = createPublicContentView(manifest);
  assert.equal(
    nextView.findRoutableBySlug("public")?.title,
    "Changed after view creation",
  );

  original.publishing = {
    visibility: "draft",
    routable: false,
    discoverable: false,
  };
  const publicationChangedView = createPublicContentView(manifest);
  assert.equal(publicationChangedView.findRoutableBySlug("public"), undefined);
  assert.equal(view.findRoutableBySlug("public")?.title, "Public title");

  await manager.dispose();
});

function memorySource(source: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(source).map((path) => ({ path }));
    },
    async read(entry) {
      return source[entry.path] ?? "";
    },
  };
}
