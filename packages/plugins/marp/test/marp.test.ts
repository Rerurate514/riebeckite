import assert from "node:assert/strict";
import { test } from "node:test";
import { isMarpDocument } from "../index.ts";
import { rehypeMarp } from "../src/rehype.ts";

const UPSTREAM_DECK = `---
marp: true
theme: default
paginate: true
---

# Slide One

First slide body.

---

## Slide Two

Second slide body.
`;

test("detects the canonical `marp: true` frontmatter flag", () => {
  assert.equal(isMarpDocument({ marp: true }), true);
  assert.equal(isMarpDocument({ marp: "true" }), true);
  assert.equal(isMarpDocument({ marp: false }), false);
  assert.equal(isMarpDocument({ marp: "false" }), false);
  assert.equal(isMarpDocument({}), false);
  assert.equal(isMarpDocument(undefined), false);
});

test("renders a whole marp:true document as a deck", async () => {
  const tree = { type: "root", children: [] };
  const file = {
    value: UPSTREAM_DECK,
    data: { matter: { marp: true } },
  };

  await rehypeMarp()(tree as never, file as never);

  const figure = tree.children[0] as {
    type: string;
    tagName?: string;
    properties?: Record<string, unknown>;
    children?: Array<{ type?: string; value?: string }>;
  };
  assert.equal(figure.tagName, "figure");
  assert.equal(figure.properties?.dataMarp, true);
  assert.equal(figure.properties?.dataMarpSlides, "2");
  assert.equal(tree.children.length, 1);

  const hasDeck = (figure.children ?? []).some(
    (child) =>
      child.type === "raw" &&
      typeof child.value === "string" &&
      child.value.includes('class="rb-marp__deck"'),
  );
  assert.equal(hasDeck, true);
});

test("a marp:true document with an empty body still renders a deck", async () => {
  const tree = { type: "root", children: [] };
  const file = {
    value: "---\nmarp: true\n---\n",
    data: { matter: { marp: true } },
  };

  await rehypeMarp()(tree as never, file as never);

  const figure = tree.children[0] as { tagName?: string };
  assert.equal(figure.tagName, "figure");
});

test("keeps the document untouched when whole-document rendering fails", async () => {
  const tree = { type: "root", children: [] };
  const file = { value: "  \n", data: { matter: { marp: true } } };

  await rehypeMarp()(tree as never, file as never);
  assert.deepEqual(tree.children, []);
});

test("still renders ```marp code blocks in ordinary documents", async () => {
  const tree = {
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
            properties: { className: ["language-marp"] },
            children: [{ type: "text", value: "# One\n\n---\n\n# Two" }],
          },
        ],
      },
    ],
  };

  await rehypeMarp()(tree as never, { data: {} });

  const pre = tree.children[0] as {
    tagName?: string;
    properties?: Record<string, unknown>;
  };
  assert.equal(pre.tagName, "figure");
  assert.equal(pre.properties?.dataMarpSlides, "2");
});

test("ignores documents without the marp flag or code blocks", async () => {
  const tree = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "p",
        properties: {},
        children: [{ type: "text", value: "plain" }],
      },
    ],
  };

  await rehypeMarp()(tree as never, { value: "# Plain note", data: {} });
  assert.equal(tree.children.length, 1);
  assert.equal(tree.children[0].tagName, "p");
});
