import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ContentManifest,
  ContentManifestEntry,
  Diagnostic,
  PostContent,
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
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
  };
}

test("series() is re-exported as seriesPlugin and registers its stylesheet", () => {
  assert.equal(seriesPlugin, series);
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
  assert.match(p1.html, /^<p>one<\/p>\n<nav class="rb-series"/);
  assert.match(p1.html, /data-series="Guide"/);
  assert.doesNotMatch(p1.html, /rb-series__prev/);
  assert.match(p1.html, /class="rb-series__next"[^>]*href="\/p2"/);

  assert.match(p2.html, /class="rb-series__prev"[^>]*href="\/p1"/);
  assert.doesNotMatch(p2.html, /rb-series__next/);

  assert.equal(manifest.bySlug.get("solo")?.html, "<p>solo</p>");
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
    manifest.bySlug.get("p1")?.html.match(/<nav class="rb-series"/g)?.length,
    1,
  );
});
