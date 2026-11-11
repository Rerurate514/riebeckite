import assert from "node:assert/strict";
import { test } from "node:test";
import { assertGolden } from "@riebeckite/test";
import { ContentManager, type ContentSource } from "../index.js";
import { Pipeline } from "../src/pipeline.js";
import { definePlugin, resolvePlugins } from "../src/types/plugin.js";
import { definePluginComponent } from "../src/types/plugin_component.js";

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

test("leaves colon text intact without directive syntax", async () => {
  const { html } = await createPipeline().execute(
    "12:30に集合。比率は3:4です。\n\n:badge[New]{variant=success}",
  );

  assert.match(html, /12:30に集合。比率は3:4です。/);
  assert.match(html, /:badge\[New\]\{variant=success\}/);
  assert.doesNotMatch(html, /<div><\/div>/);
});

test("renders registered plugin components from Markdown fences", async () => {
  const component = definePluginComponent({
    name: "notice",
    parseProps: (props) => {
      if (typeof props.message !== "string")
        throw new Error("message is required");
      return { message: props.message };
    },
    render: ({ message }) => `<strong>${message}</strong>`,
  });
  const { html } = await new Pipeline(new Map(), new Map(), undefined, {
    plugins: [definePlugin({ name: "notice", components: [component] })],
  }).execute("```riebeckite-component notice\nmessage: Safe\n```");

  assert.match(html, /data-riebeckite-component="notice"/);
  assert.match(
    html,
    /data-riebeckite-component-props="{&#x22;message&#x22;:&#x22;Safe&#x22;}"/,
  );
  assert.match(html, /<strong>Safe<\/strong>/);
});

test("escapes component props without breaking the attribute boundary", async () => {
  const component = definePluginComponent({
    name: "notice",
    render: () => "<p>Notice</p>",
  });
  const text = '"><img src=x onerror=alert(1)>';
  const { html } = await new Pipeline(new Map(), new Map(), undefined, {
    plugins: [definePlugin({ name: "notice", components: [component] })],
  }).execute(
    `\`\`\`riebeckite-component notice\ntext: ${JSON.stringify(text)}\n\`\`\``,
  );
  const serialized = html.match(
    /data-riebeckite-component-props="([^"]*)"/,
  )?.[1];
  assert.ok(serialized);
  const decoded = serialized
    .replaceAll("&#x22;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
  assert.equal(JSON.parse(decoded).text, text);
});

test("rejects duplicate plugin component names", () => {
  const component = definePluginComponent({ name: "notice", render: () => "" });

  assert.throws(
    () =>
      resolvePlugins([
        definePlugin({ name: "one", components: [component] }),
        definePlugin({ name: "two", components: [component] }),
      ]),
    /Plugin component "notice"/,
  );
});

test("wraps Markdown tables in a horizontal scroll container", async () => {
  const { html } = await createPipeline().execute(
    ["| Col A | Col B |", "| ----- | ----- |", "| 1     | 2     |"].join("\n"),
  );

  assert.match(html, /<div class="rb-table-scroll">\s*<table>/);
});

test("sanitizes raw HTML in Markdown", async () => {
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

test("trusts raw HTML added by plugins", async () => {
  const plugin = definePlugin({
    name: "trusted-hast",
    rehypePlugins: [
      () => (tree: HtmlNode) => {
        tree.children ??= [];
        tree.children.push({
          type: "raw",
          value: "<svg><foreignObject><p>slide</p></foreignObject></svg>",
        });
      },
    ],
  });

  const { html } = await new Pipeline(new Map(), new Map(), undefined, {
    plugins: [plugin],
  }).execute("# Title");

  assert.match(
    html,
    /<svg><foreignObject><p>slide<\/p><\/foreignObject><\/svg>/,
  );
});

test("keeps interactive and PDF elements added by Markdown plugins", async () => {
  const plugin = definePlugin({
    name: "markdown-plugin-elements",
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(() => (tree: HtmlNode) => {
        tree.children ??= [];
        tree.children.push({
          type: "html",
          value:
            '<span data-meta-bind="input"><input class="rb-meta-bind__control" type="range" value="2" min="0" max="10" step="1"></span><output data-meta-bind="view">2</output><figure class="rr-pdf"><object class="rr-pdf__viewer" data="/report.pdf" type="application/pdf"></object></figure>',
        });
      });
    },
  });

  const { html } = await new Pipeline(new Map(), new Map(), undefined, {
    plugins: [plugin],
  }).execute("# Title");

  assert.match(html, /data-meta-bind="input"/);
  assert.match(html, /<input[^>]*type="range"[^>]*value="2"/);
  assert.doesNotMatch(html, /<input[^>]*disabled/);
  assert.match(html, /<output data-meta-bind="view">2<\/output>/);
  assert.match(
    html,
    /<object[^>]*data="\/report\.pdf"[^>]*type="application\/pdf"><\/object>/,
  );
});

test("only keeps local PDF objects from Markdown", async () => {
  const { html } = await new Pipeline(new Map(), new Map()).execute(
    '<object data=" https://example.com/embed.html" type="text/html"></object><object data="/report.pdf" type="application/pdf"></object>',
  );

  assert.doesNotMatch(html, /https:\/\/example\.com/);
  assert.doesNotMatch(html, /text\/html/);
  assert.match(
    html,
    /<object data="\/report\.pdf" type="application\/pdf"><\/object>/,
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
      () => (tree: HtmlNode) => {
        markHeadings(tree);
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
