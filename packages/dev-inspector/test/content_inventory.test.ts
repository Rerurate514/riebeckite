import assert from "node:assert/strict";
import { test } from "node:test";
import type { CompletedContentBuildSnapshot } from "@riebeckite/core";
import { inspectContentInventory } from "../src/development_inspector_content.js";

test("reports content visibility, redirects, orphans, and unresolved links", () => {
  const note = entry("note", "/note", "public");
  const draft = entry("draft", "/draft", "draft");
  note.links.push({
    raw: "[[missing]]",
    slug: null,
    kind: "unresolved",
    embed: false,
  });
  note.aliases = ["/old-note"];
  const inventory = inspectContentInventory({
    manifest: {
      entries: [note, draft],
      publicEntries: [note],
      incomingLinks: new Map(),
      redirects: new Map([
        ["/old", { path: "/note", status: 308, slug: "note" }],
      ]),
      contentIndexAmbiguities: new Map([["duplicate", ["a", "b"]]]),
    },
  } as unknown as CompletedContentBuildSnapshot);

  assert.equal(inventory.status, "available");
  assert.equal(inventory.counts.entries, 2);
  assert.equal(inventory.counts.public, 1);
  assert.equal(inventory.counts.draft, 1);
  assert.equal(inventory.counts.orphans, 1);
  assert.equal(inventory.counts.unresolvedLinks, 1);
  assert.equal(inventory.counts.ambiguousKeys, 1);
  assert.deepEqual(inventory.entries[1]?.redirects, [
    { from: "/old", to: "/note", status: 308 },
  ]);
  assert.deepEqual(inventory.unresolved, [
    { source: "note", raw: "[[missing]]" },
  ]);
  assert.deepEqual(inventory.ambiguities, [
    { key: "duplicate", candidates: ["a", "b"] },
  ]);
  assert.deepEqual(inventory.orphans, [
    { slug: "note", title: "note", permalink: "/note" },
  ]);
});

test("reports an unavailable inventory before a build completes", () => {
  const inventory = inspectContentInventory(undefined);

  assert.equal(inventory.status, "unavailable");
  assert.deepEqual(inventory.entries, []);
});

function entry(
  slug: string,
  permalink: string,
  visibility: "public" | "draft",
) {
  return {
    slug,
    title: slug,
    permalink,
    publicLocation: { slug, permalink },
    frontmatter: {},
    publishing: {
      visibility,
      routable: visibility === "public",
      discoverable: visibility === "public",
    },
    html: "",
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
    aliases: [] as string[],
  };
}
