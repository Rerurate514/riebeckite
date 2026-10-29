import assert from "node:assert/strict";
import { test } from "node:test";
import { d2 } from "../index.js";
import { rehypeD2 } from "../src/rehype.js";
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
            properties: { className: ["language-d2"] },
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

test("registers the D2 pipeline, assets, and client entry", () => {
  const plugin = d2({ render: "client" });

  assert.equal(plugin.name, "d2");
  assert.equal(plugin.processedContentCache?.version, "d2-v1");
  assert.equal(
    plugin.assets?.[0]?.moduleSpecifier,
    "@riebeckite/plugin-d2/style.css",
  );
  assert.equal(plugin.clientEntries?.[0]?.exportName, "initD2Diagrams");
  assert.deepEqual(plugin.validateOptions?.(undefined), []);
  assert.deepEqual(
    plugin.validateOptions?.({ render: "server", layout: "grid" } as never),
    [
      { path: "render", message: 'Expected "build" or "client".' },
      { path: "layout", message: 'Expected "dagre" or "elk".' },
    ],
  );
});

test("client rendering keeps D2 source for the runtime", async () => {
  const tree = createTree("# caption: Diagram\nx -> y");

  await rehypeD2({ render: "client" })(tree, {});

  const figure = firstChild(tree);
  assert.equal(figure.tagName, "figure");
  assert.equal(figure.properties.dataD2, "pending");
  assert.equal(figure.properties.dataD2Source, "x -> y");
  assert.equal(figure.properties.dataD2Layout, "dagre");
});
