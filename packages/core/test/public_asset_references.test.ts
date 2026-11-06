import assert from "node:assert/strict";
import { test } from "node:test";
import { ContentManager } from "../src/content/content_manager.js";
import type { ContentSource } from "../src/content/content_source.js";

function memorySource(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((filePath) => ({ path: filePath }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

function managerFor(files: Record<string, string>): ContentManager {
  return new ContentManager(memorySource(files), [], {
    commitBuildState: false,
  });
}

const publicFrontmatter = "---\npublish: true\n---\n\n";

test("collects public image and attachment references without rendering", async () => {
  const manager = managerFor({
    "note.md": [
      publicFrontmatter,
      "![[assets/photo.png]]",
      "![[file.pdf]]",
      "![relative](assets/photo.png)",
      "![absolute](/assets/photo.png)",
      "![reference][img]",
      "[linked][img]",
      "[linked image](assets/photo.png)",
      '<img src="assets/photo.png">',
      '<a href="assets/photo.png">image</a>',
      "[img]: assets/photo.png",
      "[file](assets/file.pdf)",
    ].join("\n"),
    "assets/photo.png": "png",
    "assets/file.pdf": "pdf",
  });

  try {
    const references = await manager.getPublicAssetReferences();
    assert.deepEqual([...references.images].sort(), ["assets/photo.png"]);
    assert.deepEqual([...references.attachments], ["assets/file.pdf"]);
  } finally {
    await manager.dispose();
  }
});

test("excludes references from non-routable content", async () => {
  const manager = managerFor({
    "public.md": `${publicFrontmatter}![[public.png]]`,
    "draft.md": "---\npublish: false\n---\n\n![[draft.png]]",
    "private.md": "---\nprivate: true\n---\n\n![[private.png]]",
    "public.png": "png",
    "draft.png": "png",
    "private.png": "png",
  });

  try {
    const references = await manager.getPublicAssetReferences();
    assert.deepEqual([...references.images], ["public.png"]);
  } finally {
    await manager.dispose();
  }
});

test("ignores ambiguous and missing wikilink assets", async () => {
  const manager = managerFor({
    "note.md": `${publicFrontmatter}![[photo.png]]\n![[missing.png]]`,
    "a/photo.png": "png",
    "b/photo.png": "png",
  });

  try {
    const references = await manager.getPublicAssetReferences();
    assert.deepEqual([...references.images], []);
  } finally {
    await manager.dispose();
  }
});
