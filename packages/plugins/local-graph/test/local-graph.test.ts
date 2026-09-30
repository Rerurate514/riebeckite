import assert from "node:assert/strict";
import { test } from "node:test";
import { buildGraphEdges, layoutRadialGraph } from "@riebeckite/core";
import { localGraphPlugin } from "../index.ts";

const NODES = [
  { slug: "a", outgoing: ["b", "b", "c"], backlinks: [] },
  { slug: "b", outgoing: ["a"], backlinks: [] },
  { slug: "c", outgoing: ["a"], backlinks: [] },
];

test("buildGraphEdges de-duplicates and filters invisible endpoints", () => {
  assert.deepEqual(buildGraphEdges(NODES), [
    { source: "a", target: "b" },
    { source: "a", target: "c" },
    { source: "b", target: "a" },
    { source: "c", target: "a" },
  ]);

  assert.deepEqual(buildGraphEdges(NODES, new Set(["a", "b"])), [
    { source: "a", target: "b" },
    { source: "b", target: "a" },
  ]);

  assert.deepEqual(buildGraphEdges(NODES, new Set(["a"])), []);
});

test("layoutRadialGraph centers the selected node and clamps radii", () => {
  const layout = layoutRadialGraph(NODES, {
    width: 200,
    height: 100,
    centerSlug: "b",
  });

  assert.deepEqual(layout.get("b"), { x: 100, y: 50, radius: 8 });

  const a = layout.get("a");
  assert.ok(a);
  assert.ok(Math.abs(a.x - 82) < 1e-6);
  assert.ok(Math.abs(a.y - 18.8231) < 1e-3);

  const crowded = layoutRadialGraph(
    [
      {
        slug: "x",
        outgoing: Array.from({ length: 100 }, (_, index) => `t${index}`),
        backlinks: [],
      },
    ],
    { width: 100, height: 100, centerSlug: "x" },
  );
  assert.equal(crowded.get("x")?.radius, 14);
});

test("localGraphPlugin registers only its stylesheet", () => {
  const plugin = localGraphPlugin();

  assert.equal(plugin.name, "local-graph");
  assert.deepEqual(plugin.assets, [
    {
      pluginName: "local-graph",
      kind: "style",
      moduleSpecifier: "@riebeckite/plugin-local-graph/style.css",
    },
  ]);
});
