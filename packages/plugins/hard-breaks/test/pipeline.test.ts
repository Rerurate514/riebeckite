import assert from "node:assert/strict";
import { test } from "node:test";
import { Pipeline } from "@riebeckite/core";
import { assertGolden } from "@riebeckite/test";
import { hardBreaks } from "../index.ts";

async function renderWithPlugin(markdown: string): Promise<string> {
  const pipeline = new Pipeline(new Map(), new Map(), undefined, {
    plugins: [hardBreaks()],
  });
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
