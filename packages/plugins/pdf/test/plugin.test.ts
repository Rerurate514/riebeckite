import assert from "node:assert/strict";
import { test } from "node:test";
import { pdf } from "../index.js";

test("rejects invalid options", () => {
  assert.deepEqual(pdf().validateOptions?.({ initialPage: 0 } as never), [
    { path: "initialPage", message: "Expected a positive integer." },
  ]);
});

test("honours Obsidian page and height fragments", async () => {
  const render = pdf().renderers?.[0]?.render;
  assert.ok(render);

  const html = await render({
    kind: "attachment",
    path: "doc.pdf",
    url: "/assets/attachments/doc.pdf",
    raw: "doc.pdf",
    label: "doc.pdf",
    embed: true,
    fragment: "page=3&height=400",
  } as never);

  assert.ok(typeof html === "string");
  assert.match(html, /data="\/assets\/attachments\/doc\.pdf#page=3"/);
  assert.match(
    html,
    /class="rr-pdf__open" href="\/assets\/attachments\/doc\.pdf#page=3"/,
  );
  assert.match(html, /--rr-pdf-height: 400px/);
});
