import { test } from "node:test";
import assert from "node:assert/strict";
import { Pipeline } from "@riebeckite/core";
import { assertGolden } from "@riebeckite/test";
import { hardBreaks, hardBreaksPlugin } from "../index.ts";

async function renderWithPlugin(markdown: string): Promise<string> {
  const pipeline = new Pipeline(new Map(), new Map(), undefined, {
    plugins: [hardBreaksPlugin()],
  });
  const { html } = await pipeline.execute(markdown);
  return html.trim();
}

async function renderWithoutPlugin(markdown: string): Promise<string> {
  const pipeline = new Pipeline(new Map(), new Map(), undefined, {});
  const { html } = await pipeline.execute(markdown);
  return html.trim();
}

test("a single soft break becomes <br>", async () => {
  assert.equal(
    await renderWithPlugin("line one\nline two"),
    "<p>line one<br>line two</p>",
  );
});

test("every soft break in a multi-line paragraph is converted", async () => {
  assert.equal(await renderWithPlugin("a\nb\nc"), "<p>a<br>b<br>c</p>");
});

test("a blank line still splits paragraphs", async () => {
  assert.equal(
    await renderWithPlugin("first para\nstill first\n\nsecond para\nstill second"),
    "<p>first para<br>still first</p>\n<p>second para<br>still second</p>",
  );
});

test("fenced code blocks are unchanged", async () => {
  assert.equal(
    await renderWithPlugin("text before\n\n```js\nconst a = 1;\nconst b = 2;\n```\n\ntext after"),
    '<p>text before</p>\n<pre><code class="language-js">const a = 1;\nconst b = 2;\n</code></pre>\n<p>text after</p>',
  );
});

test("inline code content is unchanged", async () => {
  assert.equal(
    await renderWithPlugin("a `code` b\nc"),
    "<p>a <code>code</code> b<br>c</p>",
  );
  assert.equal(
    await renderWithPlugin("x `a\nb` y"),
    "<p>x <code>a b</code> y</p>",
  );
});

test("an explicit hard break is not converted twice", async () => {
  assert.equal(
    await renderWithPlugin("hard  \nbreak here"),
    "<p>hard<br>break here</p>",
  );
  assert.equal(
    await renderWithPlugin("hard\\\nbreak here"),
    "<p>hard<br>break here</p>",
  );
});

test("line breaks in list items are handled by the AST structure", async () => {
  assert.equal(
    await renderWithPlugin("- item one\n  continued\n- item two"),
    "<ul>\n  <li>item one<br>continued</li>\n  <li>item two</li>\n</ul>",
  );
});

test("line breaks in blockquotes behave like ordinary paragraphs", async () => {
  assert.equal(
    await renderWithPlugin("> quote line one\n> quote line two"),
    "<blockquote>\n  <p>quote line one<br>quote line two</p>\n</blockquote>",
  );
});

test("headings keep their Markdown structure", async () => {
  assert.equal(
    await renderWithPlugin("# Heading one\n\ntext"),
    '<h1 id="heading-one">Heading one</h1>\n<p>text</p>',
  );
});

test("raw HTML in Markdown is left as-is", async () => {
  assert.equal(
    await renderWithPlugin("<div>raw</div>\n\nplain"),
    "<div>raw</div>\n<p>plain</p>",
  );
});

test("without the plugin the standard soft break output is preserved", async () => {
  assert.equal(
    await renderWithoutPlugin("line one\nline two"),
    "<p>\n  line one\n  line two\n</p>",
  );
});

test("output is deterministic for the same input", async () => {
  const markdown = "one\ntwo\n\n- three\n  four\n\n> five\n> six";
  const first = await renderWithPlugin(markdown);
  const second = await renderWithPlugin(markdown);
  assert.equal(first, second);
});

test("golden: hard breaks render through the markdown pipeline", async () => {
  const markdown = [
    "今日はいい天気です。",
    "散歩に行きました。",
    "明日も晴れるといいな。",
    "",
    "- りんご",
    "  バナナ",
    "",
    "> 引用の一行目",
    "> 引用の二行目",
    "",
    "`inline code` stays put.",
    "",
    "```txt",
    "code",
    "lines",
    "```",
  ].join("\n");

  const pipeline = new Pipeline(new Map(), new Map(), undefined, {
    plugins: [hardBreaks()],
  });
  const { html } = await pipeline.execute(markdown);

  assertGolden(html, new URL("./__golden__/hard_breaks.html", import.meta.url));
});
