import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentManifest,
  type ContentSource,
  createPublicContentView,
  resolveConfig,
} from "@riebeckite/core";
import {
  getRelatedPosts,
  type RelatedPostsOptions,
  relatedPosts,
  renderRelatedPosts,
} from "../index.ts";

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

async function manifest(
  options?: RelatedPostsOptions,
): Promise<ContentManifest> {
  return await new ContentManager(source(FILES), [], {
    config,
    plugins: [relatedPosts(options)],
  }).getManifest();
}

async function renderFor(
  slug: string,
  options?: RelatedPostsOptions,
): Promise<string> {
  const view = createPublicContentView(await manifest(options));
  const entry = view.findRoutableBySlug(slug);
  if (!entry) return "";
  const related = await getRelatedPosts({ view, entry, options });
  return renderRelatedPosts(related);
}

test("lists discoverable entries that share a tag", async () => {
  const alphaHtml = await renderFor("notes/alpha");
  assert.ok(alphaHtml.includes(">Beta</a>"), alphaHtml);
  assert.ok(!alphaHtml.includes(">Alpha</a>"));
});

test("never leaks draft, unlisted, or scheduled entries", async () => {
  for (const slug of [
    "index",
    "notes/alpha",
    "notes/beta",
    "notes/gamma",
    "notes/unlisted",
    "notes/draft",
    "notes/scheduled",
  ]) {
    const html = await renderFor(slug);
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

test("does not surface discovery UI for non-discoverable pages", async () => {
  for (const slug of ["notes/unlisted", "notes/draft", "notes/scheduled"]) {
    assert.equal(await renderFor(slug), "");
  }
});

test("respects max", async () => {
  const alphaHtml = await renderFor("notes/alpha", { max: 1 });
  assert.equal((alphaHtml.match(/data-rr-related/g) ?? []).length, 1);
});
