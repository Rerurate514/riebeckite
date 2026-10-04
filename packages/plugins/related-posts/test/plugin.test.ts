import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  resolveConfig,
} from "@riebeckite/core";
import {
  RELATED_POSTS_ATTRIBUTE,
  type RelatedPostsOptions,
  relatedPosts,
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

const explicitConfig = resolveConfig({
  site: { title: "Test" },
  content: { filters: { publishStrategy: "explicit" } },
});

const files = {
  "source.md":
    "---\npublish: true\ntitle: Source\ntags: [shared]\n---\n# Source",
  "tagged.md":
    "---\npublish: true\ntitle: Tagged\ntags: [shared]\n---\n# Tagged",
  "isolated.md": "---\npublish: true\ntitle: Isolated\n---\n# Isolated",
};

function manager(options: RelatedPostsOptions = {}) {
  return new ContentManager(source(files), [], {
    config: explicitConfig,
    plugins: [relatedPosts(options)],
  });
}

test("publishes the navigation to eligible article footers", async () => {
  const content = manager();
  const manifest = await content.getManifest();

  const source = manifest.bySlug.get("source");
  const footer = source?.bodySlots?.["article.footer"] ?? "";
  assert.ok(footer.includes(RELATED_POSTS_ATTRIBUTE));
  assert.ok(footer.includes('href="/tagged"'));
  assert.ok(footer.includes("data-related-score="));
  assert.ok(!source?.html.includes(RELATED_POSTS_ATTRIBUTE));
});

test("does not add navigation to processed content html", async () => {
  const content = manager();
  const manifest = await content.getManifest();

  const processed = await content.getProcessedContent("source");
  assert.equal(processed.html, manifest.bySlug.get("source")?.html);
  assert.ok(!processed.html.includes(RELATED_POSTS_ATTRIBUTE));
});

test("leaves entries with no related candidates untouched", async () => {
  const manifest = await manager().getManifest();

  assert.ok(
    !(
      manifest.bySlug.get("isolated")?.bodySlots?.["article.footer"] ?? ""
    ).includes(RELATED_POSTS_ATTRIBUTE),
  );
});

test("applies heading and limit options", async () => {
  const manifest = await manager({ heading: false, limit: 1 }).getManifest();
  const html =
    manifest.bySlug.get("source")?.bodySlots?.["article.footer"] ?? "";

  assert.ok(html.includes(RELATED_POSTS_ATTRIBUTE));
  assert.ok(!html.includes("<h2"));
  assert.equal((html.match(/<li /g) ?? []).length, 1);
});

test("registers the stylesheet asset", async () => {
  const manifest = await manager().getManifest();

  assert.ok(
    manifest.assets.some(
      (asset) =>
        asset.moduleSpecifier === "@riebeckite/plugin-related-posts/style.css",
    ),
  );
});

test("validates option shapes", () => {
  assert.deepEqual(relatedPosts().validateOptions?.({}), []);

  const invalid = {
    limit: -1,
    minScore: -2,
    heading: "yes",
    headingText: "   ",
    className: "",
    useTags: "no",
    useBacklinks: "no",
  } as unknown as RelatedPostsOptions;

  const plugin = relatedPosts(invalid);
  const paths = (plugin.validateOptions?.(plugin.options) ?? [])
    .map((issue) => issue.path)
    .sort();

  assert.deepEqual(paths, [
    "className",
    "heading",
    "headingText",
    "limit",
    "minScore",
    "useBacklinks",
    "useTags",
  ]);
});
