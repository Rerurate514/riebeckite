import assert from "node:assert/strict";
import { test } from "node:test";
import { Pipeline } from "@riebeckite/core";
import { sidenotes } from "../index.ts";

const MARKDOWN = [
  "Text with a note.[^1]",
  "",
  "Another reference.[^1]",
  "",
  "[^1]: The note body.",
  "",
].join("\n");

async function render(
  markdown: string,
  options: Parameters<typeof sidenotes>[0] = {},
): Promise<string> {
  const pipeline = new Pipeline(new Map(), new Map(), undefined, {
    plugins: [sidenotes(options)],
  });
  return (await pipeline.execute(markdown)).html;
}

test("keeps the GFM footnote list at the end by default", async () => {
  const html = await render(MARKDOWN);

  assert.match(
    html,
    /<section[^>]*class="footnotes rr-sidenotes__footnotes"[^>]*data-rr-sidenotes-placement="end"/,
  );
  assert.match(html, /href="#user-content-fn-1"/);
  assert.match(html, /data-footnote-ref/);
  assert.match(html, /data-footnote-backref/);
  assert.doesNotMatch(html, /rr-sidenotes__note/);
});

test("marks references without replacing the native footnote link", async () => {
  const html = await render("Text.[^1]\n\n[^1]: Note body.\n");

  assert.match(html, /<sup class="rr-sidenotes__ref">/);
  assert.match(html, /class="rr-sidenotes__toggle"/);
  assert.match(html, /id="user-content-fnref-1"/);
  assert.match(html, /aria-label="Footnote 1"/);
  assert.doesNotMatch(html, /aria-expanded/);
  assert.doesNotMatch(html, /aria-controls/);
});

test("moves definitions into one margin note per footnote", async () => {
  const html = await render(MARKDOWN, { placement: "margin" });

  assert.match(html, /<aside class="rr-sidenotes__note" id="rr-sidenotes-1"/);
  assert.match(html, /href="#rr-sidenotes-1"/);
  assert.match(html, /data-rr-sidenotes-placement="margin"/);
  assert.match(html, /rr-sidenotes__body"><p>The note body\.<\/p>/);
  assert.equal((html.match(/data-rr-sidenotes-note/g) ?? []).length, 1);
});

test("applies margin options to the generated note", async () => {
  const html = await render("Text.[^1]\n\n[^1]: Note body.\n", {
    placement: "margin",
    className: "custom-note",
    ariaLabel: "Note",
    openLabel: "See",
  });

  assert.match(html, /<aside class="rr-sidenotes__note custom-note"/);
  assert.match(html, /aria-label="Note 1"/);
  assert.match(html, /aria-label="See 1"/);
});
