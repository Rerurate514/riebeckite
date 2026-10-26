import assert from "node:assert/strict";
import { test } from "node:test";
import { assertGolden } from "@riebeckite/test";
import type { Node } from "unist";
import { ContentManager, type ContentSource } from "../index.js";
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

test("wraps Markdown tables in a horizontal scroll container", async () => {
  const { html } = await createPipeline().execute(
    ["| Col A | Col B |", "| ----- | ----- |", "| 1     | 2     |"].join("\n"),
  );

  assert.match(html, /<div class="rb-table-scroll">\s*<table>/);
});

test("sanitizes raw HTML after plugin transformations", async () => {
  const { html } = await createPipeline().execute(
    [
      "# Raw HTML",
      "",
      '<img src="x" alt="safe" onerror="alert(1)">',
      '<script type="application/json">{"ok":true}</script>',
      '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
      '<a href="javascript:alert(1)">unsafe link</a>',
      '<img src="data:text/html,unsafe">',
      '<svg><foreignObject><p>unsafe</p></foreignObject><path d="M0 0"></path></svg>',
      "<math><mi>x</mi></math>",
      '<div id="location" class="plugin-output" data-plugin="safe" style="background:url(https://evil.test)">safe</div>',
    ].join("\n"),
  );

  assert.match(html, /<img src="x" alt="safe">/);
  assert.match(html, /<a>unsafe link<\/a>/);
  assert.match(html, /<svg>[\s\S]*<path d="M0 0"><\/path>[\s\S]*<\/svg>/);
  assert.match(html, /<math>\s*<mi>x<\/mi>\s*<\/math>/);
  assert.match(html, /id="user-content-location"/);
  assert.match(html, /class="plugin-output"/);
  assert.match(html, /data-plugin="safe"/);
  assert.doesNotMatch(html, /style=/);
  assert.doesNotMatch(
    html,
    /onerror|<script|<iframe|foreignObject|javascript:|data:text/i,
  );
});

test("sanitizes unsafe HAST added by plugins", async () => {
  const plugin = definePlugin({
    name: "unsafe-hast",
    rehypePlugins: [
      () => (tree: Node) => {
        const root = tree as unknown as HtmlNode;
        root.children ??= [];
        root.children.push({
          type: "element",
          tagName: "script",
          properties: {},
          children: [{ type: "text", value: "alert(1)" }],
        });
        root.children.push({ type: "raw", value: "<script>alert(2)</script>" });
        root.children.push({
          type: "element",
          tagName: "div",
          properties: {
            className: ["safe-plugin-output"],
            onClick: "alert(1)",
          },
          children: [{ type: "text", value: "safe" }],
        });
      },
    ],
  });

  const { html } = await new Pipeline(new Map(), new Map(), undefined, {
    plugins: [plugin],
  }).execute("# Title");

  assert.match(html, /class="safe-plugin-output"/);
  assert.doesNotMatch(html, /<script|onclick|alert\([12]\)/i);
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

test("ContentManager supplies the source slug to Markdown pipeline plugins", async () => {
  let sourceSlug: string | undefined;
  const plugin = definePlugin({
    name: "source-slug",
    extendMarkdownPipeline: (_pipeline, context) => {
      sourceSlug = context.sourceSlug;
    },
  });
  const content = new ContentManager(
    memorySource({ "guide.ja.md": "# Guide" }),
    [],
    { plugins: [plugin] },
  );

  await content.getProcessedContent("guide.ja");

  assert.equal(sourceSlug, "guide.ja");
});

test("rewrites markdown links to published content permalinks", async () => {
  const contentIndex = new Map([
    ["guide/setup", "guide/setup"],
    ["guide/reference", "guide/reference"],
    ["readme", "ja/README"],
    ["en/readme", "en/README"],
    ["ja/readme", "ja/README"],
  ]);
  const permalinks = new Map([
    ["guide/setup", "/guide/setup"],
    ["guide/reference", "/guide/reference"],
    ["en/README", "/en/README"],
    ["ja/README", "/README"],
  ]);

  const { html } = await new Pipeline(contentIndex, permalinks).execute(
    [
      "[setup](./setup.md#install)",
      "[reference](reference.md?view=full#api)",
      "[english](/en/README.md)",
      "[default language](/ja/README.md)",
      "[external](https://example.com/readme.md)",
      "[unpublished](../../packages/example/README.md)",
    ].join("\n\n"),
    { sourceSlug: "guide/index" },
  );

  assert.match(html, /href="\/guide\/setup#install"/);
  assert.match(html, /href="\/guide\/reference\?view=full#api"/);
  assert.match(html, /href="\/en\/README"/);
  assert.match(html, /href="\/README"/);
  assert.match(html, /href="https:\/\/example.com\/readme.md"/);
  assert.match(html, /href="\.\.\/\.\.\/packages\/example\/README.md"/);
});

type HtmlNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HtmlNode[];
  value?: string;
};

function markHeadings(node: HtmlNode): void {
  if (node.type === "element" && node.tagName === "h1") {
    node.properties = { ...node.properties, className: ["tagged"] };
  }
  for (const child of node.children ?? []) markHeadings(child);
}

function memorySource(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}
