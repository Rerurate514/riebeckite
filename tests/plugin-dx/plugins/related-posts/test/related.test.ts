import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentManifest,
  type ContentSource,
  resolveConfig,
} from "@riebeckite/core";
import { relatedPostsPlugin } from "../index.ts";

function source(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

const config = resolveConfig({
  site: { title: "Test" },
  content: { filters: { publishStrategy: "explicit" } },
});

const FILES: Record<string, string> = {
  "index.md": "---\ntitle: Home\npublish: true\ntags: [demo]\n---\n# Home",
  "notes/alpha.md":
    "---\ntitle: Alpha\npublish: true\ntags: [demo, tech]\n---\n# Alpha",
  "notes/beta.md":
    "---\ntitle: Beta\npublish: true\ntags: [demo, life]\n---\n# Beta",
  "notes/gamma.md":
    "---\ntitle: Gamma\npublish: true\ntags: [other]\n---\n# Gamma",
  "notes/unlisted.md":
    "---\ntitle: Unlisted Secret\nvisibility: unlisted\ntags: [demo]\n---\n# Unlisted Secret",
  "notes/draft.md":
    "---\ntitle: Draft Secret\nvisibility: draft\ntags: [demo]\n---\n# Draft Secret",
  "notes/scheduled.md":
    '---\ntitle: Scheduled Secret\npublishAt: "2999-01-01T00:00:00.000Z"\ntags: [demo]\n---\n# Scheduled Secret',
};

async function manifest(): Promise<ContentManifest> {
  return await new ContentManager(source(FILES), [], {
    config,
    plugins: [relatedPostsPlugin()],
  }).getManifest();
}

function footer(manifest: ContentManifest, slug: string): string {
  return manifest.bySlug.get(slug)?.bodySlots?.["article.footer"] ?? "";
}

test("lists discoverable entries that share a tag", async () => {
  const result = await manifest();
  const alpha = footer(result, "notes/alpha");
  assert.ok(alpha.includes(">Beta</a>"), alpha);
  assert.ok(!alpha.includes(">Alpha</a>"));
});

test("never leaks draft, unlisted, or scheduled entries", async () => {
  const result = await manifest();
  for (const slug of [
    "index",
    "notes/alpha",
    "notes/beta",
    "notes/gamma",
    "notes/unlisted",
    "notes/draft",
    "notes/scheduled",
  ]) {
    const html = footer(result, slug);
    assert.ok(!html.includes("Draft Secret"), `${slug} leaked a draft`);
    assert.ok(
      !html.includes("Unlisted Secret"),
      `${slug} leaked an unlisted entry`,
    );
    assert.ok(
      !html.includes("Scheduled Secret"),
      `${slug} leaked a scheduled entry`,
    );
  }
});

test("does not inject discovery UI into unlisted pages", async () => {
  const result = await manifest();
  assert.equal(footer(result, "notes/unlisted"), "");
  assert.equal(footer(result, "notes/draft"), "");
  assert.equal(footer(result, "notes/scheduled"), "");
});

test("respects max and the slot option", async () => {
  const result = await new ContentManager(source(FILES), [], {
    config,
    plugins: [relatedPostsPlugin({ max: 1, slot: "article.aside" })],
  }).getManifest();
  assert.equal(
    result.bySlug.get("notes/alpha")?.bodySlots?.["article.footer"],
    undefined,
  );
  const aside =
    result.bySlug.get("notes/alpha")?.bodySlots?.["article.aside"] ?? "";
  assert.equal((aside.match(/data-rr-related/g) ?? []).length, 1);
});
