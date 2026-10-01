import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ContentManifest,
  type ContentManifestEntry,
  type PostFrontmatter,
  resolveConfig,
} from "@riebeckite/core";
import { searchPlugin } from "../index.ts";

function entry(
  slug: string,
  frontmatter: PostFrontmatter,
  html: string,
  tags: string[] = [],
): ContentManifestEntry {
  const permalink = `/${slug}`;
  return {
    slug,
    permalink,
    publicLocation: { slug, permalink },
    title: slug,
    frontmatter,
    publishing:
      frontmatter.publish === false ||
      frontmatter.private === true ||
      frontmatter.draft === true
        ? { visibility: "draft", routable: false, discoverable: false }
        : { visibility: "public", routable: true, discoverable: true },
    html,
    tags,
    links: [],
    backlinks: [],
    assets: [],
  };
}

function manifestOf(entries: ContentManifestEntry[]): ContentManifest {
  const publicEntries = entries.filter((item) => item.publishing.routable);
  const discoverableEntries = entries.filter(
    (item) => item.publishing.discoverable,
  );
  return {
    entries,
    publicEntries,
    discoverableEntries,
    bySlug: new Map(entries.map((item) => [item.slug, item])),
    contentIndex: new Map(),
  } as unknown as ContentManifest;
}

test("searchPlugin registers its style, client entry, and endpoint", () => {
  const plugin = searchPlugin();

  assert.equal(plugin.name, "search");
  assert.deepEqual(plugin.assets, [
    {
      pluginName: "search",
      kind: "style",
      moduleSpecifier: "@riebeckite/plugin-search/style.css",
    },
  ]);
  assert.deepEqual(plugin.clientEntries, [
    {
      pluginName: "search",
      moduleSpecifier: "@riebeckite/plugin-search/client",
      exportName: "initSearch",
    },
  ]);
  assert.equal(plugin.endpoints?.length, 1);
  assert.equal(plugin.endpoints?.[0]?.path, "/search-data.json");
});

test("the search-data endpoint returns published items with cache headers", async () => {
  const config = resolveConfig({
    site: { title: "Test" },
    content: { filters: { publishStrategy: "explicit" } },
  });
  const endpoint = searchPlugin().endpoints?.[0];
  assert.ok(endpoint);

  const response = await endpoint.handler({
    config,
    manifest: manifestOf([
      entry(
        "a",
        { publish: true, title: "A", date: "2024-01-02" },
        "<p>Hi</p>",
        ["t"],
      ),
      entry("b", { publish: false, title: "B" }, "<p>No</p>"),
    ]),
  } as never);

  assert.deepEqual(response.json, [
    {
      slug: "a",
      permalink: "/a",
      title: "A",
      headings: [],
      body: "Hi",
      excerpt: "Hi",
      tags: ["t"],
      date: "2024-01-02T00:00:00.000Z",
    },
  ]);
  assert.equal(response.headers?.["Cache-Control"], "public, max-age=300");
});
