import assert from "node:assert/strict";
import { test } from "node:test";
import { assertGoldenJson } from "@riebeckite/test";
import { ContentManager } from "../src/content/content_manager.js";
import type { ContentSource } from "../src/content/content_source.js";
import { layoutForceGraph } from "../src/content/graph_layout.js";

function memorySource(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

const projectFiles: Record<string, string> = {
  "index.md": [
    "---",
    "title: Home",
    "publish: true",
    "tags: [welcome]",
    "---",
    "",
    "# Home",
    "",
    "See [[note-a]] and [[Alpha Note]] and [[missing note]].",
    "",
    "![[diagram.png]]",
    "",
    "[[report.pdf]]",
    "",
    "Tagged #deep-topic and #123.",
    "",
  ].join("\n"),
  "note-a.md": [
    "---",
    "title: Note A",
    "publish: true",
    "tags: [welcome, how-to]",
    "aliases: [Alpha Note]",
    "---",
    "",
    "# Note A",
    "",
    "Back to [[index]].",
    "",
  ].join("\n"),
  "draft.md": [
    "---",
    "title: Draft",
    "publish: false",
    "---",
    "",
    "# Draft",
    "",
  ].join("\n"),
  "diagram.png": "",
  "report.pdf": "",
  "logo.svg": "",
};

test("manifest resolves wikilinks, assets, tags, and graph edges", async () => {
  const manager = new ContentManager(memorySource(projectFiles));
  const manifest = await manager.getManifest();

  assert.deepEqual(await manager.getAllPosts(), [
    { slug: "index" },
    { slug: "note-a" },
    { slug: "draft" },
  ]);
  assert.deepEqual(
    manifest.entries.map((entry) => [entry.slug, entry.title, entry.permalink]),
    [
      ["index", "Home", "/"],
      ["note-a", "Note A", "/note-a"],
      ["draft", "Draft", "/draft"],
    ],
  );

  const index = manifest.bySlug.get("index");
  assert.ok(index);
  assert.deepEqual(index.links, [
    { raw: "note-a", slug: "note-a", kind: "note", embed: false },
    { raw: "Alpha Note", slug: "note-a", kind: "note", embed: false },
    { raw: "missing note", slug: null, kind: "unresolved", embed: false },
    { raw: "diagram.png", slug: "diagram.png", kind: "image", embed: true },
    { raw: "report.pdf", slug: "report.pdf", kind: "attachment", embed: false },
  ]);
  assert.deepEqual(index.assets, [
    { path: "diagram.png" },
    { path: "report.pdf" },
  ]);
  assert.deepEqual(index.tags, ["welcome", "deep-topic"]);
});

test("manifest computes backlinks and a navigable content graph", async () => {
  const manager = new ContentManager(memorySource(projectFiles));
  const manifest = await manager.getManifest();
  const graph = manifest.graph;

  assert.deepEqual(manifest.bySlug.get("index")?.backlinks, ["note-a"]);
  assert.deepEqual(manifest.bySlug.get("note-a")?.backlinks, ["index"]);
  assert.deepEqual(await manager.getBacklinks("note-a"), [{ slug: "index" }]);

  assert.deepEqual(graph.outgoingSlugs("index"), ["note-a"]);
  assert.deepEqual(graph.incomingSlugs("index"), ["note-a"]);
  assert.deepEqual(graph.neighborSlugs("index"), ["note-a"]);
  assert.deepEqual(graph.neighborSlugs("note-a"), ["index"]);
  assert.deepEqual(graph.neighborSlugs("draft"), []);
  assert.equal(graph.get("missing"), null);
  assert.equal(graph.get("note-a")?.title, "Note A");
});

test("force graph layout initializes deterministic bounded positions", () => {
  const nodes = [
    { slug: "index", outgoing: ["note-a", "note-b"], backlinks: [] },
    { slug: "note-a", outgoing: [], backlinks: ["index"] },
    { slug: "note-b", outgoing: ["note-a"], backlinks: ["index"] },
  ];

  const first = layoutForceGraph(nodes, {
    width: 320,
    height: 240,
    centerSlug: "index",
    iterations: 40,
  });
  const second = layoutForceGraph(nodes, {
    width: 320,
    height: 240,
    centerSlug: "index",
    iterations: 40,
  });

  assert.deepEqual([...first], [...second]);
  for (const node of first.values()) {
    assert.ok(node.x >= node.radius && node.x <= 320 - node.radius);
    assert.ok(node.y >= node.radius && node.y <= 240 - node.radius);
  }
});

test("force graph layout handles empty, single, and invalid dimension inputs", () => {
  assert.deepEqual(
    [...layoutForceGraph([], { width: 0, height: Number.NaN })],
    [],
  );

  const single = layoutForceGraph(
    [{ slug: "only", outgoing: ["only"], backlinks: ["only"] }],
    {
      width: 0,
      height: Number.POSITIVE_INFINITY,
      centerSlug: "only",
      iterations: Number.POSITIVE_INFINITY,
      linkDistance: Number.NaN,
      repulsion: Number.NEGATIVE_INFINITY,
      damping: Number.POSITIVE_INFINITY,
    },
  );
  const node = single.get("only");
  assert.ok(node);
  assert.ok(Number.isFinite(node.x));
  assert.ok(Number.isFinite(node.y));
  assert.ok(node.x >= node.radius);
  assert.ok(node.y >= node.radius);
});

test("force graph layout is stable across unnecessary input order changes", () => {
  const nodes = [
    { slug: "c", outgoing: ["a"], backlinks: ["b"] },
    { slug: "a", outgoing: ["b"], backlinks: ["c"] },
    { slug: "b", outgoing: ["c"], backlinks: ["a"] },
    { slug: "isolated", outgoing: [], backlinks: [] },
  ];
  const reversed = [...nodes].reverse();

  const first = layoutForceGraph(nodes, {
    width: 360,
    height: 260,
    centerSlug: "a",
    iterations: 30,
  });
  const second = layoutForceGraph(reversed, {
    width: 360,
    height: 260,
    centerSlug: "a",
    iterations: 30,
  });

  assert.deepEqual([...first], [...second]);
});

test("manifest indexes tags, assets, and case-insensitive link targets", async () => {
  const manager = new ContentManager(memorySource(projectFiles));
  const manifest = await manager.getManifest();

  assert.deepEqual(
    [...manifest.byTag].map(([tag, entries]) => [
      tag,
      entries.map((entry) => entry.slug),
    ]),
    [
      ["welcome", ["index", "note-a"]],
      ["deep-topic", ["index"]],
      ["how-to", ["note-a"]],
    ],
  );
  assert.deepEqual(
    [...manifest.byAsset].map(([path, entries]) => [
      path,
      entries.map((entry) => entry.slug),
    ]),
    [
      ["diagram.png", ["index"]],
      ["report.pdf", ["index"]],
    ],
  );
  assert.equal(manifest.contentIndex.get("alpha note"), "note-a");
  assert.equal(manifest.contentIndex.get("report"), "report.pdf");
  assert.equal(manifest.contentIndex.get("logo"), "logo.svg");
});

test("manifest records links, tags, and graph edges as a golden", async () => {
  const manager = new ContentManager(memorySource(projectFiles));
  const manifest = await manager.getManifest();

  const projection = {
    entries: manifest.entries.map((entry) => ({
      slug: entry.slug,
      permalink: entry.permalink,
      title: entry.title,
      tags: entry.tags.join(" "),
      links: entry.links,
      backlinks: entry.backlinks.join(" "),
      assets: entry.assets,
    })),
    publicSlugs: manifest.publicEntries.map((entry) => entry.slug).join(" "),
    tags: Object.fromEntries(
      [...manifest.byTag].map(([tag, entries]) => [
        tag,
        entries.map((entry) => entry.slug).join(" "),
      ]),
    ),
    graph: Object.fromEntries(
      manifest.entries.map((entry) => [
        entry.slug,
        manifest.graph.neighborSlugs(entry.slug).join(" "),
      ]),
    ),
  };

  assertGoldenJson(
    projection,
    new URL("./__golden__/content_graph.json", import.meta.url),
  );
});

test("reading an unknown slug fails instead of returning empty content", async () => {
  const manager = new ContentManager(memorySource(projectFiles));

  await assert.rejects(
    manager.getPost("missing"),
    /Content entry was not found: missing\.md/,
  );
});
