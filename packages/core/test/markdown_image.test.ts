import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  definePlugin,
  Pipeline,
} from "../index.js";

function memorySource(
  files: Record<string, string | Uint8Array>,
): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

test("normalizes local Markdown image URLs and emits public image assets", async () => {
  const relative = new Uint8Array([1]);
  const parent = new Uint8Array([2]);
  const root = new Uint8Array([3]);
  const japanese = new Uint8Array([4]);
  const manager = new ContentManager(
    memorySource({
      "notes/page.md": [
        "---",
        "publish: true",
        "---",
        "![relative](./image.png)",
        "![parent](../assets/photo.jpeg)",
        "![root](/images/logo.svg)",
        "![encoded](./日本%20語.webp)",
      ].join("\n"),
      "notes/image.png": relative,
      "assets/photo.jpeg": parent,
      "images/logo.svg": root,
      "notes/日本 語.webp": japanese,
    }),
  );

  const manifest = await manager.getManifest();
  const entry = manifest.publicEntries[0];

  assert.deepEqual(
    entry?.assets.map((asset) => asset.path),
    [
      "notes/image.png",
      "assets/photo.jpeg",
      "images/logo.svg",
      "notes/日本 語.webp",
    ],
  );
  assert.match(entry?.html ?? "", /src="\/notes\/image\.png"/);
  assert.match(entry?.html ?? "", /src="\/assets\/photo\.jpeg"/);
  assert.match(entry?.html ?? "", /src="\/images\/logo\.svg"/);
  assert.match(
    entry?.html ?? "",
    /src="\/notes\/%E6%97%A5%E6%9C%AC%20%E8%AA%9E\.webp"/,
  );
  assert.deepEqual(
    manifest.generatedOutputs.map((output) => [output.path, output.content]),
    [
      ["assets/photo.jpeg", parent],
      ["images/logo.svg", root],
      ["notes/image.png", relative],
      ["notes/日本 語.webp", japanese],
    ],
  );
});

test("does not emit assets from unpublished Markdown or invalid image URLs", async () => {
  const manager = new ContentManager(
    memorySource({
      "private.md": "---\npublish: false\n---\n![secret](secret.png)",
      "secret.png": new Uint8Array([1]),
      "index.md": [
        "---",
        "publish: true",
        "---",
        "![remote](https://example.com/image.png)",
        "![data](data:image/png;base64,AA==)",
        "![outside](../../secret.png)",
      ].join("\n"),
    }),
  );

  const manifest = await manager.getManifest();
  assert.deepEqual(manifest.generatedOutputs, []);
  assert.deepEqual(manifest.publicEntries[0]?.assets, []);
});

test("normalizes referenced Markdown images", async () => {
  const pipeline = new Pipeline(new Map(), new Map());
  const content = await pipeline.execute(
    "![logo][asset]\n\n[asset]: ./images/logo.png",
    { sourceSlug: "guide/page" },
  );

  assert.match(content.html, /src="\/guide\/images\/logo\.png"/);
});

test("rejects a plugin output that collides with a Markdown image", async () => {
  const manager = new ContentManager(
    memorySource({
      "index.md": "---\npublish: true\n---\n![logo](images/logo.png)",
      "images/logo.png": new Uint8Array([1]),
    }),
    [],
    {
      plugins: [
        definePlugin({
          name: "conflicting-output",
          buildEnd: ({ output }) => {
            output.emitAsset({ path: "images/logo.png", content: "other" });
          },
        }),
      ],
    },
  );

  await assert.rejects(manager.getManifest(), /images\/logo\.png/);
});
