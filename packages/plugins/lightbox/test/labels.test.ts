import assert from "node:assert/strict";
import { test } from "node:test";
import { lightboxPlugin, rehypeLightbox } from "../index.ts";
import type { ElementNode } from "../src/types.js";

function makeTree(alt = "A cat"): ElementNode {
  return {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "p",
        children: [
          {
            type: "element",
            tagName: "img",
            properties: { src: "/photo.png", alt },
            children: [],
          },
        ],
      },
    ],
  };
}

function findTrigger(tree: ElementNode): ElementNode {
  const paragraph = tree.children?.[0] as ElementNode;
  return paragraph.children?.[0] as ElementNode;
}

test("rehypeLightbox labels triggers in English by default", () => {
  const tree = makeTree();
  rehypeLightbox()(tree);

  const trigger = findTrigger(tree);
  assert.equal(trigger.tagName, "a");
  assert.equal(trigger.properties?.ariaLabel, "Expand image: A cat");
});

test("rehypeLightbox drops the alt suffix when there is no alt", () => {
  const tree = makeTree("");
  rehypeLightbox()(tree);

  assert.equal(findTrigger(tree).properties?.ariaLabel, "Expand image");
});

test("rehypeLightbox honors expandLabel overrides", () => {
  const tree = makeTree();
  rehypeLightbox({ expandLabel: "Zoom image" })(tree);

  assert.equal(findTrigger(tree).properties?.ariaLabel, "Zoom image: A cat");
});

test("lightboxPlugin forwards English labels to the client entry", () => {
  const entry = lightboxPlugin().clientEntries?.[0];

  assert.deepEqual(entry?.publicConfig, {
    expandLabel: "Expand image",
    closeLabel: "Close",
  });
});

test("lightboxPlugin forwards label overrides to the client entry", () => {
  const entry = lightboxPlugin({
    expandLabel: "Zoom image",
    closeLabel: "閉じる",
  }).clientEntries?.[0];

  assert.deepEqual(entry?.publicConfig, {
    expandLabel: "Zoom image",
    closeLabel: "閉じる",
  });
});
