import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  type ContentSourceEntry,
  definePlugin,
  resolveConfig,
} from "@riebeckite/core";
import { hoverPreviewPlugin } from "../index.ts";
import { HOVER_PREVIEW_INDEX_PATH } from "../src/render.ts";
import type { HoverPreviewIndex } from "../src/types.ts";

function source(files: Record<string, string>): ContentSource {
  const entries: ContentSourceEntry[] = Object.keys(files).map((path) => ({
    path,
  }));
  return {
    async scan() {
      return entries;
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

const config = resolveConfig({
  site: { title: "Test" },
  content: {
    filters: {
      publishStrategy: "explicit",
    },
  },
});

const customLocation = definePlugin({
  name: "test-hover-preview-location",
  resolveContentLocations: ({ entries }) =>
    entries.map((entry) => ({
      slug: entry.slug,
      permalink:
        entry.slug === "localized/target"
          ? "/ja/custom-target"
          : `/${entry.slug}`,
      metadata: entry.slug.startsWith("localized/")
        ? { "l10n.lang": "ja" }
        : {},
    })),
});

async function manifest(files: Record<string, string>) {
  const manager = new ContentManager(source(files), [], {
    config,
    plugins: [customLocation, hoverPreviewPlugin()],
    publishingBuildTime: "2025-01-01T00:00:00.000Z",
  });
  return await manager.getManifest();
}

function previewOutput(content: Awaited<ReturnType<typeof manifest>>) {
  const output = content.generatedOutputs.find(
    (candidate) => candidate.path === HOVER_PREVIEW_INDEX_PATH,
  );
  assert.ok(output);
  assert.equal(output.owner, "hover-preview");
  assert.deepEqual(output.dependencies, [{ type: "global" }]);
  return output;
}

test("emits one shared preview index and keeps only metadata in linked pages", async () => {
  const content = await manifest({
    "index.md":
      "---\npublish: true\ntitle: Index\n---\n# Index\n\n[Alpha](/alpha) [Beta](/beta)",
    "alpha.md":
      "---\npublish: true\ntitle: Alpha\n---\n# Alpha\n\nAlpha body text.",
    "beta.md":
      "---\npublish: true\ntitle: Beta\n---\n# Beta\n\nBeta body text.",
  });

  const output = previewOutput(content);
  const index = JSON.parse(String(output.content)) as HoverPreviewIndex;
  assert.equal(index["/alpha"]?.title, "Alpha");
  assert.equal(index["/alpha"]?.slug, "alpha");
  assert.match(index["/alpha"]?.excerpt ?? "", /Alpha body text/);
  assert.equal(index["/beta"]?.title, "Beta");

  const page = content.bySlug.get("index");
  assert.ok(page);
  assert.match(page.html, /data-rb-hover-preview/);
  assert.match(
    page.html,
    /data-index-src="\/_riebeckite\/hover-preview\/index\.json"/,
  );
  assert.doesNotMatch(page.html, /Alpha body text/);
});

test("shared preview index preserves publication boundary and custom locations", async () => {
  const content = await manifest({
    "index.md":
      "---\npublish: true\ntitle: Index\n---\n# Index\n\n[Target](/ja/custom-target)",
    "localized/target.md":
      "---\npublish: true\ntitle: 対象\n---\n# 対象\n\nLocalized body.",
    "unlisted.md":
      "---\nvisibility: unlisted\ntitle: Unlisted\n---\n# Unlisted\n\nUnlisted body.",
    "draft.md":
      "---\nvisibility: draft\ntitle: Draft\n---\n# Draft\n\nDraft body.",
    "private.md":
      "---\nprivate: true\ntitle: Private\n---\n# Private\n\nPrivate body.",
    "future.md":
      "---\npublish: true\npublishAt: 2030-01-01T00:00:00.000Z\ntitle: Future\n---\n# Future\n\nFuture body.",
  });

  const index = JSON.parse(
    String(previewOutput(content).content),
  ) as HoverPreviewIndex;
  assert.equal(index["/ja/custom-target"]?.title, "対象");
  assert.equal(index["/ja/custom-target"]?.slug, "localized/target");
  assert.equal(index["/unlisted"]?.title, "Unlisted");
  assert.equal(index["/draft"], undefined);
  assert.equal(index["/private"], undefined);
  assert.equal(index["/future"], undefined);
});

test("shared preview index reflects entry additions, edits, and removals", async () => {
  const first = await manifest({
    "index.md":
      "---\npublish: true\ntitle: Index\n---\n# Index\n\n[Alpha](/alpha)",
    "alpha.md": "---\npublish: true\ntitle: Alpha\n---\n# Alpha\n\nFirst body.",
  });
  const second = await manifest({
    "index.md":
      "---\npublish: true\ntitle: Index\n---\n# Index\n\n[Beta](/beta)",
    "beta.md": "---\npublish: true\ntitle: Beta\n---\n# Beta\n\nSecond body.",
  });

  const firstIndex = JSON.parse(
    String(previewOutput(first).content),
  ) as HoverPreviewIndex;
  const secondIndex = JSON.parse(
    String(previewOutput(second).content),
  ) as HoverPreviewIndex;
  assert.equal(firstIndex["/alpha"]?.excerpt.includes("First body"), true);
  assert.equal(secondIndex["/alpha"], undefined);
  assert.equal(secondIndex["/beta"]?.excerpt.includes("Second body"), true);
});
