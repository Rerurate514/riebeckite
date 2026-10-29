import assert from "node:assert/strict";
import { test } from "node:test";
import { map, rehypeMap } from "../index.js";
import type { ElementNode, HastNode } from "../src/types.js";

function createTree(source: string): HastNode {
  return {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "pre",
        properties: {},
        children: [
          {
            type: "element",
            tagName: "code",
            properties: { className: ["language-map"] },
            children: [{ type: "text", value: source }],
          },
        ],
      },
    ],
  };
}

function firstChild(tree: HastNode): ElementNode {
  return (tree as { children: ElementNode[] }).children[0];
}

test("registers the map pipeline and client entry", () => {
  const plugin = map({ minZoom: 2, maxZoom: 18 });

  assert.equal(plugin.name, "map");
  assert.equal(plugin.processedContentCache?.version, "map-v1");
  assert.equal(
    plugin.assets?.[0]?.moduleSpecifier,
    "@riebeckite/plugin-map/style.css",
  );
  assert.equal(plugin.clientEntries?.[0]?.exportName, "initMap");
  assert.deepEqual(plugin.validateOptions?.(undefined), []);
  assert.deepEqual(
    plugin.validateOptions?.({ height: 0, minZoom: 18, maxZoom: 2 }),
    [
      { path: "height", message: "Expected a positive number." },
      {
        path: "maxZoom",
        message: "Expected maxZoom to be greater than or equal to minZoom.",
      },
    ],
  );
});

test("renders valid maps and reports invalid map sources", () => {
  const tree = createTree("35.6812, 139.7671");
  rehypeMap()(tree, {});

  const figure = firstChild(tree);
  assert.equal(figure.tagName, "figure");
  assert.equal(figure.properties.dataRrMap, "pending");
  assert.equal(typeof figure.properties.dataRrMapPayload, "string");

  const invalidTree = createTree("not coordinates");
  const diagnostics: Array<{ source?: string; ruleId?: string }> = [];
  rehypeMap()(invalidTree, {
    message() {
      const diagnostic = {};
      diagnostics.push(diagnostic);
      return diagnostic;
    },
  });

  assert.equal(firstChild(invalidTree).tagName, "pre");
  assert.deepEqual(diagnostics, [
    { source: "@riebeckite/plugin-map", ruleId: "invalid-source" },
  ]);
});
