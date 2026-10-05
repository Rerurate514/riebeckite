import assert from "node:assert/strict";
import { test } from "node:test";
import { ContentManager } from "../src/content/content_manager.js";
import type { ContentSource } from "../src/content/content_source.js";

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

test("a malformed frontmatter error identifies the failing content path", async () => {
  const content = new ContentManager(
    memorySource({
      "notes/good.md": "---\npublish: true\n---\n\n# Good\n",
      "notes/bad.md": '---\ntitle: "unterminated\n---\n\n# Bad\n',
    }),
  );

  await assert.rejects(
    () => content.build(),
    (error: Error) => {
      assert.equal(error.name, "YAMLParseError");
      assert.match(error.message, /Missing closing "quote/);
      assert.equal((error as Error & { path?: string }).path, "notes/bad.md");
      return true;
    },
  );
});

test("the original parse cause and line information are preserved", async () => {
  const content = new ContentManager(
    memorySource({
      "bad.md": '---\ntitle: "unterminated\n---\n\n# Bad\n',
    }),
  );

  await assert.rejects(
    () => content.build(),
    (error: Error) => {
      assert.equal(error.name, "YAMLParseError");
      assert.equal((error as { cause?: unknown }).cause, undefined);
      assert.match(error.message, /line 1, column 21/);
      assert.equal((error as Error & { path?: string }).path, "bad.md");
      return true;
    },
  );
});
