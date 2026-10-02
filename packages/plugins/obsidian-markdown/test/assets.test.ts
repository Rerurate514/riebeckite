import assert from "node:assert/strict";
import { test } from "node:test";
import { ContentManager, type ContentSource } from "@riebeckite/core";
import { obsidianMarkdown } from "../index.js";

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

test("emits images referenced by public Obsidian notes", async () => {
  const sample = new Uint8Array([137, 80, 78, 71]);
  const secret = new Uint8Array([1, 2, 3, 4]);
  const manager = new ContentManager(
    memorySource({
      "index.md": "---\npublish: true\n---\n\n![[sample.png]]\n",
      "private.md": "---\npublish: false\n---\n\n![[secret.png]]\n",
      "attachments/sample.png": sample,
      "attachments/secret.png": secret,
    }),
    [],
    { plugins: [obsidianMarkdown()] },
  );

  const manifest = await manager.getManifest();

  assert.deepEqual(
    manifest.generatedOutputs.map((output) => output.path),
    ["attachments/sample.png"],
  );
  assert.deepEqual(manifest.generatedOutputs[0].content, sample);
});

test("emits images stored inside the assets namespace", async () => {
  const logo = new Uint8Array([137, 80, 78, 71, 13]);
  const manager = new ContentManager(
    memorySource({
      "index.md": "---\npublish: true\n---\n\n![[assets/logo.png]]\n",
      "assets/logo.png": logo,
    }),
    [],
    { plugins: [obsidianMarkdown()] },
  );

  const manifest = await manager.getManifest();

  assert.deepEqual(
    manifest.generatedOutputs.map((output) => output.path),
    ["assets/logo.png"],
  );
  assert.deepEqual(manifest.generatedOutputs[0].content, logo);
});

test("retries image emission after a failed emit", async () => {
  const logo = new Uint8Array([137, 80, 78, 71, 13]);
  const files: Record<string, string | Uint8Array> = {
    "index.md": "---\npublish: true\n---\n\n![[assets/logo.png]]\n",
    "assets/logo.png": logo,
  };
  let logoReadFailed = false;
  const flakySource: ContentSource = {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      if (entry.path === "assets/logo.png" && !logoReadFailed) {
        logoReadFailed = true;
        throw new Error("temporary read failure");
      }
      return files[entry.path] ?? "";
    },
  };
  const manager = new ContentManager(flakySource, [], {
    plugins: [obsidianMarkdown()],
  });

  await assert.rejects(() => manager.getManifest());
  const manifest = await manager.getManifest();

  assert.equal(logoReadFailed, true);
  assert.deepEqual(
    manifest.generatedOutputs.map((output) => output.path),
    ["assets/logo.png"],
  );
});
