import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  resolveConfig,
} from "@riebeckite/core";
import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import {
  buildRelatedPosts,
  RELATED_POSTS_ATTRIBUTE,
  RelatedPosts,
  type RelatedPostsOptions,
  relatedPosts,
  resolveRelatedPostsOptions,
} from "../index.ts";

(globalThis as { React?: unknown }).React = { createElement, Fragment };

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

  const entry = manifest.bySlug.get("source");
  const relatedEntries = buildRelatedPosts({
    manifest,
    entry,
    options: resolveRelatedPostsOptions(),
    config: explicitConfig,
  });

  const html = renderToString(
    await RelatedPosts({
      entries: relatedEntries,
      options: resolveRelatedPostsOptions(),
    }),
  );
  assert.ok(html.includes("data-related-posts"));
  assert.ok(html.includes('href="/tagged"'));
});

test("preserves related entries rendering order", async () => {
  const manifest = await new ContentManager(source(files), [], {
    config: explicitConfig,
    plugins: [relatedPosts()],
  }).getManifest();

  const entry = manifest.bySlug.get("source");
  const relatedEntries = buildRelatedPosts({
    manifest,
    entry,
    options: resolveRelatedPostsOptions(),
    config: explicitConfig,
  });

  const html = renderToString(
    await RelatedPosts({
      entries: relatedEntries,
      options: resolveRelatedPostsOptions(),
    }),
  );

  assert.ok(html.includes("data-related-posts"));
  assert.ok(html.match(/<li /g)?.length > 0);
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

  const isolated = manifest.bySlug.get("isolated");
  assert.ok(isolated, "expected isolated entry");
  const relatedEntries = buildRelatedPosts({
    manifest,
    entry: isolated,
    options: resolveRelatedPostsOptions(),
    config: explicitConfig,
  });

  assert.deepEqual(relatedEntries, []);
});

test("keeps related entries available for manual placement", async () => {
  const manifest = await manager().getManifest();

  const entry = manifest.bySlug.get("source");
  assert.ok(entry);

  const relatedEntries = buildRelatedPosts({
    manifest,
    entry,
    options: resolveRelatedPostsOptions(),
    config: explicitConfig,
  });

  const manualHtml = renderToString(
    await RelatedPosts({
      entries: relatedEntries,
      options: resolveRelatedPostsOptions(),
    }),
  );
  assert.equal((manualHtml.match(/data-related-posts/g) ?? []).length, 1);
  assert.ok(manualHtml.includes('href="/tagged"'));
});

test("applies heading and limit options", async () => {
  const manifest = await manager({ heading: false, limit: 1 }).getManifest();

  const entry = manifest.bySlug.get("source");
  const relatedEntries = buildRelatedPosts({
    manifest,
    entry,
    options: resolveRelatedPostsOptions({ heading: false, limit: 1 }),
    config: explicitConfig,
  });

  const html = renderToString(
    await RelatedPosts({
      entries: relatedEntries,
      options: resolveRelatedPostsOptions({ heading: false, limit: 1 }),
    }),
  );

  assert.ok(html.includes("data-related-posts"));
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
