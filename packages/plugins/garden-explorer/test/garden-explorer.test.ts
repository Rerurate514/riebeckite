import assert from "node:assert/strict";
import { test } from "node:test";
import {
  layoutForceGraph,
  layoutRadialGraph,
  shouldGuardForceLayout,
} from "@riebeckite/core/client";
import { createElement, Fragment } from "hono/jsx";
import type { GardenExplorerNote } from "../src/garden-explorer.js";
import { getGardenExplorerLocalGraphNotes } from "../src/garden-explorer.js";
import { resolveGardenExplorerOptions } from "../src/garden-explorer.server.js";
import { renderGardenExplorerPage } from "../src/garden-explorer-page.js";

(globalThis as { React?: unknown }).React = { createElement, Fragment };

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

function createNotes(count: number): GardenExplorerNote[] {
  const notes: GardenExplorerNote[] = [];
  for (let i = 0; i < count; i++) {
    const slug = `note-${String(i).padStart(3, "0")}`;
    notes.push(createNote(slug, [], []));
  }
  return notes;
}

test("global graph uses all filtered notes regardless of list limit", () => {
  const notes = createNotes(100);
  const options = resolveGardenExplorerOptions({ layout: "force", depth: 1 });
  const graphNodes = layoutForceGraph(notes, {
    width: 900,
    height: 620,
    centerSlug: notes[0].slug,
    linkDistance: options.linkDistance,
    repulsion: options.repulsion,
  });
  assert.equal(graphNodes.size, 100);
});

test("radial layout handles large graphs deterministically", () => {
  const notes = createNotes(2000);
  const graphNodes = layoutRadialGraph(notes, {
    width: 900,
    height: 620,
    centerSlug: notes[0].slug,
  });
  assert.equal(graphNodes.size, 2000);
  // Verify deterministic output - same input produces same coordinates
  const graphNodes2 = layoutRadialGraph(notes, {
    width: 900,
    height: 620,
    centerSlug: notes[0].slug,
  });
  for (const [slug, node] of graphNodes) {
    const node2 = graphNodes2.get(slug);
    assert.ok(node2, `node ${slug} missing in second run`);
    assert.equal(node.x, node2.x, `x coordinate differs for ${slug}`);
    assert.equal(node.y, node2.y, `y coordinate differs for ${slug}`);
    assert.equal(node.radius, node2.radius, `radius differs for ${slug}`);
  }
});

test("force guard blocks force layout at threshold", () => {
  assert.equal(
    shouldGuardForceLayout({
      layout: "force",
      mode: "global",
      nodeCount: 499,
      approved: false,
    }),
    false,
    "499 nodes should not trigger guard",
  );
  assert.equal(
    shouldGuardForceLayout({
      layout: "force",
      mode: "global",
      nodeCount: 500,
      approved: false,
    }),
    true,
    "500 nodes should trigger guard",
  );
  assert.equal(
    shouldGuardForceLayout({
      layout: "force",
      mode: "global",
      nodeCount: 1000,
      approved: false,
    }),
    true,
    "1000 nodes should trigger guard",
  );
  assert.equal(
    shouldGuardForceLayout({
      layout: "force",
      mode: "global",
      nodeCount: 1000,
      approved: true,
    }),
    false,
    "approved should bypass guard",
  );
  assert.equal(
    shouldGuardForceLayout({
      layout: "radial",
      mode: "global",
      nodeCount: 1000,
      approved: false,
    }),
    false,
    "radial layout should not trigger guard",
  );
  assert.equal(
    shouldGuardForceLayout({
      layout: "force",
      mode: "local",
      nodeCount: 1000,
      approved: false,
    }),
    false,
    "local mode should not trigger guard",
  );
});

test("garden explorer page renders an English description", () => {
  const html = renderGardenExplorerPage(
    {
      notes: [],
      edges: [],
      tags: [],
      folders: [],
      options: resolveGardenExplorerOptions(),
    },
    "My Garden",
  );

  assert.ok(html.includes("Explore your digital garden across"), html);
  assert.ok(html.includes("My Garden"), html);
  assert.doesNotMatch(html, /[\u3040-\u30ff\u4e00-\u9faf]/);
  assert.doesNotMatch(
    html,
    /<main\b/,
    "the plugin page body must not own a main landmark; the site shell does",
  );
  assert.match(html, /<div class="rr-garden-explorer-page">/);
});
