import assert from "node:assert/strict";
import { test } from "node:test";
import type { GardenExplorerNote } from "../src/garden-explorer.js";
import { getGardenExplorerLocalGraphNotes } from "../src/garden-explorer.js";
import { resolveGardenExplorerOptions } from "../src/garden-explorer.server.js";

test("garden explorer graph options keep useful defaults", () => {
  assert.deepEqual(resolveGardenExplorerOptions(), {
    layout: "force",
    depth: 1,
    showTags: true,
    showFolders: true,
    nodeSize: 1,
    linkDistance: 84,
    repulsion: 1_800,
    showLabels: true,
  });
});

test("garden explorer graph options clamp invalid numeric values", () => {
  assert.deepEqual(
    resolveGardenExplorerOptions({
      layout: "radial",
      depth: 99,
      showTags: false,
      showFolders: false,
      nodeSize: Number.POSITIVE_INFINITY,
      linkDistance: 4,
      repulsion: 100_000,
      showLabels: false,
    }),
    {
      layout: "radial",
      depth: 4,
      showTags: false,
      showFolders: false,
      nodeSize: 0.6,
      linkDistance: 36,
      repulsion: 8_000,
      showLabels: false,
    },
  );
});

test("garden explorer graph options allow depth zero for current-only local graphs", () => {
  assert.equal(resolveGardenExplorerOptions({ depth: 0 }).depth, 0);
});

test("garden explorer graph options fall back from invalid layout values", () => {
  assert.equal(
    resolveGardenExplorerOptions({ layout: "circle" as never }).layout,
    "force",
  );
});

test("garden explorer local graph traversal respects depth and prevents cycle duplicates", () => {
  const notes = [
    createNote("a", ["b"], ["d", "incoming-only"]),
    createNote("b", ["c"], ["a"]),
    createNote("c", ["d"], ["b"]),
    createNote("d", ["a"], ["c"]),
    createNote("incoming-only", ["a"], []),
    createNote("missing-target", ["private"], []),
    createNote("disconnected", [], []),
  ];

  assert.deepEqual(slugsAtDepth(notes, "a", 0), ["a"]);
  assert.deepEqual(slugsAtDepth(notes, "a", 1), [
    "a",
    "b",
    "d",
    "incoming-only",
  ]);
  assert.deepEqual(slugsAtDepth(notes, "a", 2), [
    "a",
    "b",
    "c",
    "d",
    "incoming-only",
  ]);
  assert.deepEqual(slugsAtDepth(notes, "missing-target", 2), [
    "missing-target",
  ]);
});

function slugsAtDepth(
  notes: GardenExplorerNote[],
  selectedSlug: string,
  depth: number,
): string[] {
  return getGardenExplorerLocalGraphNotes(notes, selectedSlug, depth).map(
    (note) => note.slug,
  );
}

function createNote(
  slug: string,
  outgoing: string[],
  backlinks: string[],
): GardenExplorerNote {
  return {
    slug,
    permalink: `/${slug}`,
    title: slug,
    headings: [],
    body: "",
    excerpt: "",
    tags: [],
    date: null,
    folder: "Root",
    outgoing,
    backlinks,
  };
}
