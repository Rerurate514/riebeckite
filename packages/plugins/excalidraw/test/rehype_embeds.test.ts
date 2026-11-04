import assert from "node:assert/strict";
import { test } from "node:test";
import { replaceExcalidrawEmbeds } from "../src/rehype_embeds.ts";

test("rehype embeds replace placeholders with raw plugin HTML", () => {
  const embeds = new Map([["excalidraw-1", "<svg><text>Hello</text></svg>"]]);
  const tree = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "p",
        children: [
          {
            type: "element",
            tagName: "span",
            properties: { dataExcalidrawEmbed: "excalidraw-1" },
            children: [],
          },
        ],
      },
    ],
  };

  replaceExcalidrawEmbeds(tree, embeds);

  assert.deepEqual(tree.children[0].children[0], {
    type: "raw",
    value: "<svg><text>Hello</text></svg>",
  });
  assert.equal(embeds.size, 0);
});

test("rehype embeds remove placeholders without stored HTML", () => {
  const tree = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "span",
        properties: { dataExcalidrawEmbed: "missing" },
        children: [],
      },
    ],
  };

  replaceExcalidrawEmbeds(tree, new Map());

  assert.deepEqual(tree.children, []);
});
