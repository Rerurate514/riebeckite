import assert from "node:assert/strict";
import { test } from "node:test";
import type { Html, Root } from "mdast";
import { remarkQuery } from "../index.ts";
import { createQueryPlaceholder } from "../src/placeholder.ts";

function root(children: unknown[]): Root {
  return { type: "root", children } as unknown as Root;
}

test("remarkQuery replaces matching code blocks with an encoded placeholder", () => {
  const tree = root([
    { type: "code", lang: "query", value: "limit: 1" },
    { type: "code", lang: "js", value: "const x = 1;" },
    { type: "paragraph", children: [] },
  ]);

  remarkQuery()(tree);

  assert.equal(tree.children.length, 3);
  const first = tree.children[0] as Html;
  assert.equal(first.type, "html");
  assert.equal(first.value, createQueryPlaceholder("limit: 1"));
  assert.equal(tree.children[1]?.type, "code");
  assert.equal(tree.children[2]?.type, "paragraph");
});

test("remarkQuery honors a custom language and ignores untyped code", () => {
  const tree = root([
    { type: "code", lang: "rr-query", value: "a" },
    { type: "code", lang: "query", value: "b" },
    { type: "code", value: "c" },
  ]);

  remarkQuery({ language: "rr-query" })(tree);

  assert.equal((tree.children[0] as Html).value, createQueryPlaceholder("a"));
  assert.equal(tree.children[1]?.type, "code");
  assert.equal((tree.children[1] as { value: string }).value, "b");
  assert.equal(tree.children[2]?.type, "code");
});
