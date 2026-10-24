import assert from "node:assert/strict";
import test from "node:test";
import type { ContentIcon } from "@riebeckite/core";
import type { Root } from "mdast";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { remarkIcons } from "../src/remark.js";

const ICONS: Record<string, ContentIcon> = {
  rocket: {
    id: "emoji:🚀",
    kind: "emoji",
    html: '<span class="rr-icon rr-icon--emoji" aria-hidden="true">🚀</span>',
  },
  smile: {
    id: "emoji:😄",
    kind: "emoji",
    html: '<span class="rr-icon rr-icon--emoji" aria-hidden="true">😄</span>',
  },
};

function transform(markdown: string): Root {
  const tree = unified().use(remarkParse).parse(markdown) as Root;
  remarkIcons({
    identifier: ":",
    resolve: (name) => ICONS[name],
  })(tree, { value: markdown } as never);
  return tree;
}

function htmlCount(tree: Root): number {
  let count = 0;
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    const node = value as { type?: string; children?: unknown[] };
    if (node.type === "html") count += 1;
    for (const child of node.children ?? []) visit(child);
  };
  visit(tree);
  return count;
}

test("resolves inline icons in headings, paragraphs, lists, and tables", () => {
  const tree = transform(
    "# Launch :rocket:\n\nHello :smile: world\n\n- item :rocket:\n\n| a | b |\n| - | - |\n| :rocket: | x |",
  );
  assert.equal(htmlCount(tree), 4);
});

test("leaves code, inline code, links, and unknown names untouched", () => {
  const tree = transform(
    "` :rocket: `\n\n```\n:rocket:\n```\n\n[link](https://example.com/:rocket:)\n\n:not_an_icon:",
  );
  assert.equal(htmlCount(tree), 0);
  assert.match(JSON.stringify(tree), /:rocket:/);
  assert.match(JSON.stringify(tree), /:not_an_icon:/);
});

test("escaped icons stay literal", () => {
  const tree = transform("\\:rocket: and :smile:");
  assert.equal(htmlCount(tree), 1);
  assert.match(JSON.stringify(tree), /:rocket:/);
});

test("custom identifiers are honored", () => {
  const tree = unified().use(remarkParse).parse("Hi ::rocket::") as Root;
  remarkIcons({
    identifier: "::",
    resolve: (name) => ICONS[name],
  })(tree, { value: "Hi ::rocket::" } as never);
  assert.equal(htmlCount(tree), 1);
});

test("pack timestamp syntax is not rewritten without a pack resolver", () => {
  const tree = transform(":Li:123456789012345678:");
  assert.equal(htmlCount(tree), 0);
});
