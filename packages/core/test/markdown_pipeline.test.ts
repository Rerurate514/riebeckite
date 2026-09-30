import assert from "node:assert/strict";
import { test } from "node:test";
import type { Node } from "unist";
import { assertGolden } from "../../../tests/helpers/golden.js";
import { Pipeline } from "../src/pipeline.js";
import { definePlugin } from "../src/types/plugin.js";

const markdown = [
  "---",
  "title: Pipeline Note",
  "tags: [demo]",
  "---",
  "",
  "# Heading",
  "",
  "Some **bold** text with `inline code` and a [link](https://example.com).",
  "",
  "## Lists",
  "",
  "- one",
  "- two",
  "",
  "| Col A | Col B |",
  "| ----- | ----- |",
  "| 1     | 2     |",
  "",
  "Inline math $x^2$ stays.",
  "",
  "```ts",
  "const value = 1;",
  "```",
  "",
  'Raw <span data-x="1">html</span>.',
  "",
].join("\n");

function createPipeline(): Pipeline {
  return new Pipeline(
    new Map([["note", "note"]]),
    new Map([["note", "/note"]]),
  );
}

test("renders frontmatter, slugs, GFM, math, and raw HTML", async () => {
  const { html, frontmatter } = await createPipeline().execute(markdown);

  assert.deepEqual(frontmatter, { title: "Pipeline Note", tags: ["demo"] });
  assert.match(html, /id="heading"/);
  assert.match(html, /<table/);
  assert.match(html, /language-ts/);
  assert.match(html, /<math/);
  assert.match(html, /data-x="1"/);
  assertGolden(
    html,
    new URL("./__golden__/pipeline_note.html", import.meta.url),
  );
});

test("frontmatter-only content produces no body html", async () => {
  const { frontmatter, html } = await createPipeline().execute(
    "---\ntitle: Only\n---\n",
  );

  assert.deepEqual(frontmatter, { title: "Only" });
  assert.equal(html.trim(), "");
});

test("plugins can extend the HTML pipeline", async () => {
  const plugin = definePlugin({
    name: "tag-headings",
    rehypePlugins: [
      () => (tree: Node) => {
        markHeadings(tree as unknown as HtmlNode);
      },
    ],
  });

  const { html } = await new Pipeline(new Map(), new Map(), undefined, {
    plugins: [plugin],
  }).execute("# Title");

  assert.match(html, /class="tagged"/);
});

type HtmlNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HtmlNode[];
};

function markHeadings(node: HtmlNode): void {
  if (node.type === "element" && node.tagName === "h1") {
    node.properties = { ...node.properties, className: ["tagged"] };
  }
  for (const child of node.children ?? []) markHeadings(child);
}
