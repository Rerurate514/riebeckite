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

test("forwards Obsidian time fragments to the media source", async () => {
  const render = media().renderers?.[0]?.render;
  assert.ok(render);

  const video = await render({
    kind: "attachment",
    path: "clip.mp4",
    url: "/assets/attachments/clip.mp4",
    raw: "clip.mp4",
    label: "clip.mp4",
    embed: true,
    fragment: "t=10",
  } as never);
  assert.ok(typeof video === "string");
  assert.match(video, /<source src="\/assets\/attachments\/clip\.mp4#t=10"/);

  const audio = await render({
    kind: "attachment",
    path: "voice.mp3",
    url: "/assets/attachments/voice.mp3",
    raw: "voice.mp3",
    label: "voice.mp3",
    embed: true,
    fragment: "start=5,12",
  } as never);
  assert.ok(typeof audio === "string");
  assert.match(audio, /<source src="\/assets\/attachments\/voice\.mp3#t=5,12"/);
});
