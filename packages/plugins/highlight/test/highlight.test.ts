import assert from "node:assert/strict";
import { test } from "node:test";
import { remarkHighlight } from "../index.ts";

type TextNode = { type: string; value: string };

function paragraph(value: string) {
  return {
    type: "root",
    children: [
      {
        type: "paragraph",
        children: [{ type: "text", value }] as unknown[],
      },
    ],
  };
}

function childNodes(tree: ReturnType<typeof paragraph>): unknown[] {
  return (tree.children[0] as { children: unknown[] }).children;
}

test("splits a ==highlight== span into text and html nodes", () => {
  const tree = paragraph("a ==x== b");

  remarkHighlight()(tree as never);

  const nodes = childNodes(tree);
  assert.equal(nodes.length, 3);
  assert.deepEqual(nodes[0] satisfies TextNode, { type: "text", value: "a " });
  assert.deepEqual(nodes[1], {
    type: "html",
    value: '<mark class="rb-highlight">x</mark>',
  });
  assert.deepEqual(nodes[2] satisfies TextNode, {
    type: "text",
    value: " b",
  });
});

test("escapes highlighted text and applies custom tag and className", () => {
  const tree = paragraph("==a & b==");

  remarkHighlight({ className: 'c"x', tag: "span" })(tree as never);

  const [node] = childNodes(tree);
  assert.deepEqual(node, {
    type: "html",
    value: '<span class="c&quot;x">a &amp; b</span>',
  });
});

test("falls back to mark when the tag is not a valid name", () => {
  const tree = paragraph("==x==");

  remarkHighlight({ tag: "1bad" })(tree as never);

  const [node] = childNodes(tree);
  assert.deepEqual(node, {
    type: "html",
    value: '<mark class="rb-highlight">x</mark>',
  });
});

test("leaves whitespace-only and unterminated spans untouched", () => {
  const whitespace = paragraph("a ==  == b");
  remarkHighlight()(whitespace as never);
  assert.equal(childNodes(whitespace).length, 1);
  assert.deepEqual(childNodes(whitespace)[0], {
    type: "text",
    value: "a ==  == b",
  });

  const unterminated = paragraph("a ==x= b");
  remarkHighlight()(unterminated as never);
  assert.equal(childNodes(unterminated).length, 1);
});

test("does not rewrite text inside skipped parents such as html", () => {
  const tree = {
    type: "root",
    children: [
      {
        type: "html",
        children: [{ type: "text", value: "==x==" }],
      },
    ],
  };

  remarkHighlight()(tree as never);

  const html = tree.children[0] as { children: TextNode[] };
  assert.deepEqual(html.children[0], { type: "text", value: "==x==" });
});
