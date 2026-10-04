import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentManifest,
  type ContentManifestEntry,
  type ContentSource,
  type Diagnostic,
  type PostContent,
  resolveConfig,
} from "@riebeckite/core";
import { series, seriesPlugin } from "../index.ts";

function entry(
  slug: string,
  frontmatter: PostContent["frontmatter"],
  html: string,
): ContentManifestEntry {
  const permalink = `/${slug}`;
  return {
    slug,
    permalink,
    publicLocation: { slug, permalink },
    title: slug,
    frontmatter,
    html,
    publishing: { visibility: "public", routable: true, discoverable: true },
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
  };
}

test("series() is re-exported as seriesPlugin and registers its stylesheet", () => {
  assert.equal(seriesPlugin, series);
  assert.deepEqual(series().outputDependencies, [{ type: "global" }]);
  assert.deepEqual(series().assets, [
    {
      pluginName: "series",
      kind: "style",
      moduleSpecifier: "@riebeckite/plugin-series/style.css",
    },
  ]);
});

test("the manifest hook appends navigation only to multi-part series", async () => {
  const plugin = series();
  const entries = [
    entry("p2", { series: "Guide", series_order: 2 }, "<p>two</p>"),
    entry("p1", { series: "Guide", series_order: 1 }, "<p>one</p>"),
    entry("solo", { series: "Solo", series_order: 1 }, "<p>solo</p>"),
  ];
  const manifest = {
    entries,
    publicEntries: entries,
    bySlug: new Map(entries.map((item) => [item.slug, item])),
  } as unknown as ContentManifest;
  const diagnostics: Diagnostic[] = [];

  await plugin.onManifestCreated?.({ manifest, diagnostics } as never);

  const p1 = manifest.bySlug.get("p1");
  const p2 = manifest.bySlug.get("p2");
  assert.ok(p1);
  assert.ok(p2);
  assert.equal(p1.html, "<p>one</p>");
  assert.match(
    p1.bodySlots?.["article.footer"] ?? "",
    /^<nav class="rb-series"/,
  );
  assert.match(p1.bodySlots?.["article.footer"] ?? "", /data-series="Guide"/);
  assert.doesNotMatch(
    p1.bodySlots?.["article.footer"] ?? "",
    /rb-series__prev/,
  );
  assert.match(
    p1.bodySlots?.["article.footer"] ?? "",
    /class="rb-series__next"[^>]*href="\/p2"/,
  );

  assert.equal(p2.html, "<p>two</p>");
  assert.match(
    p2.bodySlots?.["article.footer"] ?? "",
    /class="rb-series__prev"[^>]*href="\/p1"/,
  );
  assert.doesNotMatch(
    p2.bodySlots?.["article.footer"] ?? "",
    /rb-series__next/,
  );

  assert.equal(manifest.bySlug.get("solo")?.html, "<p>solo</p>");
  assert.equal(
    manifest.bySlug.get("solo")?.bodySlots?.["article.footer"],
    undefined,
  );
  assert.deepEqual(diagnostics, []);
});

test("the manifest hook does not duplicate generated navigation", async () => {
  const plugin = series();
  const entries = [
    entry("p1", { series: "Guide", series_order: 1 }, "<p>one</p>"),
    entry("p2", { series: "Guide", series_order: 2 }, "<p>two</p>"),
  ];
  const manifest = {
    entries,
    publicEntries: entries,
    bySlug: new Map(entries.map((item) => [item.slug, item])),
  } as unknown as ContentManifest;
  const diagnostics: Diagnostic[] = [];

  await plugin.onManifestCreated?.({ manifest, diagnostics } as never);
  await plugin.onManifestCreated?.({ manifest, diagnostics } as never);

  assert.equal(
    manifest.bySlug
      .get("p1")
      ?.bodySlots?.["article.footer"]?.match(/<nav class="rb-series"/g)?.length,
    1,
  );
});

function source(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((filePath) => ({ path: filePath }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

test("publishes navigation in the manifest footer slot without changing cached PostContent", async () => {
  const files = {
    "part-1.md":
      "---\npublish: true\ntitle: Part 1\nseries: Guide\nseries_order: 1\n---\n# Part 1",
    "part-2.md":
      "---\npublish: true\ntitle: Part 2\nseries: Guide\nseries_order: 2\n---\n# Part 2",
  };
  const config = resolveConfig({
    site: { title: "Test" },
    content: { filters: { publishStrategy: "explicit" } },
  });
  const content = new ContentManager(source(files), [], {
    config,
    plugins: [series()],
  });

  const manifest = await content.getManifest();
  const processed = await content.getProcessedContent("part-1");

  assert.equal(processed.html, manifest.bySlug.get("part-1")?.html);
  assert.doesNotMatch(processed.html, /<nav class="rb-series"/);
  assert.match(
    manifest.bySlug.get("part-1")?.bodySlots?.["article.footer"] ?? "",
    /data-series="Guide"/,
  );
  assert.match(
    manifest.bySlug.get("part-1")?.bodySlots?.["article.footer"] ?? "",
    /href="\/part-2"/,
  );
});
