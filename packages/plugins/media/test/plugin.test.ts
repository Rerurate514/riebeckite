import assert from "node:assert/strict";
import { test } from "node:test";
import { media } from "../index.js";

test("renders supported attachments and ignores other files", async () => {
  const render = media().renderers?.[0]?.render;
  assert.ok(render);

  const html = await render({
    kind: "attachment",
    path: "clip.mp4",
    url: "/clip.mp4",
    raw: "",
    label: "",
    embed: true,
  } as never);
  assert.ok(typeof html === "string");
  assert.match(html, /<figure class="rr-media rr-media--video"/);
  assert.match(html, /data-media-path="clip.mp4"/);

  assert.equal(
    await render({
      kind: "attachment",
      path: "note.txt",
      url: "/note.txt",
      raw: "",
      label: "",
      embed: true,
    } as never),
    null,
  );
});
