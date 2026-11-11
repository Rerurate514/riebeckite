import assert from "node:assert/strict";
import { test } from "node:test";
import { ContentManager } from "../src/content/content_manager.js";
import type { ContentSource } from "../src/content/content_source.js";
import { createInvalid } from "../src/testing/fixtures.js";
import { definePlugin } from "../src/types/plugin.js";

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

test("concurrent manifest requests share the in-flight build", async () => {
  let loadedCount = 0;
  const manager = new ContentManager(
    memorySource({
      "note.md": "---\ntitle: Note\npublish: true\n---\n\n# Note\n",
    }),
    [],
    {
      plugins: [
        definePlugin({
          name: "load-counter",
          onContentLoaded: () => {
            loadedCount += 1;
          },
        }),
      ],
    },
  );

  const [first, second] = await Promise.all([
    manager.getManifest(),
    manager.getManifest(),
  ]);

  assert.equal(first, second);
  assert.equal(loadedCount, 1);
});

test("concurrent content processing shares pipeline initialization", async () => {
  const manager = new ContentManager(
    memorySource({
      "first.md": "# First\n",
      "second.md": "# Second\n",
    }),
  );
  const pipelineManager = createInvalid<{ getPipeline(): Promise<unknown> }>(
    manager,
  );
  const [first, second] = await Promise.all([
    pipelineManager.getPipeline(),
    pipelineManager.getPipeline(),
  ]);

  assert.equal(first, second);
});

test("pipeline initialization can retry after a source failure", async () => {
  let scans = 0;
  const manager = new ContentManager({
    async scan() {
      scans += 1;
      if (scans === 1) throw new Error("source unavailable");
      return [{ path: "note.md" }];
    },
    async read() {
      return "# Note\n";
    },
  });
  const pipelineManager = createInvalid<{ getPipeline(): Promise<unknown> }>(
    manager,
  );

  await assert.rejects(pipelineManager.getPipeline(), /source unavailable/);
  assert.ok(await pipelineManager.getPipeline());
});
