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

test("validates options", () => {
  const plugin = d2({ render: "client" });

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
