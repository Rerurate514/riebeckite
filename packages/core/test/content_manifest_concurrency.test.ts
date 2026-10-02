import assert from "node:assert/strict";
import { test } from "node:test";
import { ContentManager } from "../src/content/content_manager.js";
import type { ContentSource } from "../src/content/content_source.js";
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
