import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ContentManifestEntry,
  type ResolvedRiebeckiteConfig,
  resolveConfig,
} from "@riebeckite/core";
import { assertGolden } from "../../../../tests/helpers/golden.ts";
import { renderRobots, renderSitemap } from "../index.ts";

const config: ResolvedRiebeckiteConfig = resolveConfig({
  site: { title: "Test", baseUrl: "https://example.com" },
  content: { filters: { publishStrategy: "explicit" } },
});

function entry(
  slug: string,
  overrides: Partial<ContentManifestEntry> = {},
): ContentManifestEntry {
  const permalink = slug === "index" ? "/" : `/${slug}`;
  return {
    slug,
    permalink,
    publicLocation: { slug, permalink },
    title: slug,
    frontmatter: {},
    html: "",
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
    ...overrides,
  };
}

test("renderSitemap lists the home page plus published entries and lastmod", () => {
  const xml = renderSitemap(config, [
    entry("index", { frontmatter: { publish: true, updated: "2024-01-01" } }),
    entry("a", { frontmatter: { publish: true, updated: "2024-01-05" } }),
    entry("b", { frontmatter: { publish: true, published: "2024-01-04" } }),
    entry("c", { frontmatter: { publish: true, noindex: true } }),
    entry("d", { frontmatter: { publish: false } }),
  ]);

  assert.equal((xml.match(/<url>/g) ?? []).length, 3);
  assert.match(xml, /<loc>https:\/\/example\.com\/<\/loc><\/url>/);
  assert.doesNotMatch(xml, /<loc>https:\/\/example\.com\/index<\/loc>/);
  assert.doesNotMatch(xml, /noindex/);

  assertGolden(xml, new URL("./__golden__/sitemap.xml", import.meta.url));
});

test("renderSitemap with no entries still emits the home page", () => {
  assert.equal(
    renderSitemap(config, []),
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/</loc></url></urlset>',
  );
});

test("renderRobots emits a permissive policy and the sitemap URL", () => {
  assertGolden(
    renderRobots(config),
    new URL("./__golden__/robots.txt", import.meta.url),
  );
  assert.equal(
    renderRobots(config),
    "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml\n",
  );
});
