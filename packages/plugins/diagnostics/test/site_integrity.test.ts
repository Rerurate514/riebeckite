import assert from "node:assert/strict";
import test from "node:test";
import type { ContentManifest, ContentManifestEntry } from "@riebeckite/core";
import { checkSiteIntegrity } from "../src/site_integrity.js";

test("site integrity reports missing routes, unresolved wikilinks, assets, duplicates, and redirects", () => {
  const manifest = manifestOf([
    entry("notes/foo", "/foo", {
      html: '<p><a href="/missing?x=1#part">missing</a><img src="/missing.png"></p>',
      links: [
        { raw: "Missing Note", slug: null, kind: "unresolved", embed: false },
        { raw: "private", slug: "notes/private", kind: "note", embed: false },
      ],
    }),
    entry("notes/bar", "/foo"),
    entry("notes/private", "/private", { published: false }),
  ]);
  manifest.publicRedirects.set("/old-a", {
    path: "/old-a",
    status: 308,
    slug: "notes/foo",
  });
  manifest.publicRedirects.set("/foo", {
    path: "/foo",
    status: 308,
    slug: "notes/bar",
  });
  manifest.pagePaths = ["/generated"];

  const codes = checkSiteIntegrity(manifest).map(
    (diagnostic) => diagnostic.code,
  );

  assert(codes.includes("content-integrity:broken-link"));
  assert(codes.includes("content-integrity:unresolved-wikilink"));
  assert(codes.includes("content-integrity:broken-asset"));
  assert(codes.includes("content-integrity:duplicate-public-location"));
  assert(codes.includes("content-integrity:redirect-public-location-conflict"));
});

test("site integrity ignores external urls, fragments, query strings, and plugin page paths", () => {
  const manifest = manifestOf([
    entry("notes/foo", "/foo", {
      html: '<p><a href="https://example.com">x</a><a href="mailto:a@example.com">m</a><a href="#local">f</a><a href="/generated?tab=1#top">generated</a></p>',
    }),
  ]);
  manifest.pagePaths = ["/generated"];

  assert.deepEqual(checkSiteIntegrity(manifest), []);
});

test("site integrity reports redirects to non-routable content", () => {
  const manifest = manifestOf([
    entry("public", "/public"),
    entry("draft", "/draft", { published: false }),
  ]);
  manifest.redirects.set("/old-draft", {
    path: "/old-draft",
    status: 308,
    slug: "draft",
  });

  const diagnostic = checkSiteIntegrity(manifest).find(
    (item) => item.code === "content-integrity:redirect-target-missing",
  );
  assert.ok(diagnostic);
  assert.equal(diagnostic.slug, "draft");
  assert.equal(diagnostic.target, "/old-draft");
});

test("site integrity flags a directory-index plugin page sharing a content route", () => {
  const manifest = manifestOf([
    entry("docs/getting-started", "/docs/getting-started"),
  ]);
  manifest.pagePaths = ["/docs/getting-started/"];

  const codes = checkSiteIntegrity(manifest).map(
    (diagnostic) => diagnostic.code,
  );

  assert(codes.includes("content-integrity:duplicate-public-location"));
});

test("site integrity identifies colliding plugin page producers", () => {
  const manifest = manifestOf([]);
  manifest.pageRoutes = [
    { pathname: "/foo", pluginName: "first", pageType: "first-page" },
    { pathname: "/foo/", pluginName: "second", pageType: "second-page" },
  ];

  const diagnostic = checkSiteIntegrity(manifest).find(
    (item) => item.code === "content-integrity:duplicate-public-location",
  );

  assert.ok(diagnostic);
  assert.match(diagnostic.message, /first:first-page/);
  assert.match(diagnostic.message, /second:second-page/);
});

test("site integrity reports ambiguous README and index folder owners", () => {
  const manifest = manifestOf([
    entry("docs/README", "/docs/README"),
    entry("docs/index", "/docs/index"),
  ]);
  const diagnostic = checkSiteIntegrity(manifest).find(
    (item) => item.code === "content-integrity:ambiguous-folder-page-owner",
  );

  assert.ok(diagnostic);
  assert.deepEqual(diagnostic.meta, {
    folder: "docs",
    readme: { slug: "docs/README", permalink: "/docs/README" },
    index: { slug: "docs/index", permalink: "/docs/index" },
  });
});

function entry(
  slug: string,
  permalink: string,
  options: Partial<ContentManifestEntry> & { published?: boolean } = {},
): ContentManifestEntry {
  const published = options.published !== false;
  return {
    slug,
    permalink,
    publicLocation: { slug, permalink },
    title: slug,
    frontmatter: published ? { publish: true } : { publish: false },
    html: options.html ?? "",
    publishing: {
      visibility: published ? "public" : "draft",
      routable: published,
      discoverable: published,
    },
    tags: [],
    links: options.links ?? [],
    backlinks: [],
    assets: options.assets ?? [],
  };
}

function manifestOf(entries: ContentManifestEntry[]): ContentManifest {
  const publicEntries = entries.filter(
    (entry) => entry.frontmatter.publish !== false,
  );
  return {
    entries,
    publicEntries,
    discoverableEntries: publicEntries,
    bySlug: new Map(entries.map((entry) => [entry.slug, entry])),
    byContentId: new Map(),
    byAlias: new Map(),
    byPermalink: new Map(entries.map((entry) => [entry.permalink, entry])),
    redirects: new Map(),
    publicRedirects: new Map(),
    byRoutablePermalink: new Map(
      publicEntries.map((entry) => [entry.permalink, entry]),
    ),
    byTag: new Map(),
    byAsset: new Map(),
    outgoingLinks: new Map(),
    incomingLinks: new Map(),
    contentIndex: new Map(),
    graph: {
      nodes: () => entries,
      get: () => null,
      outgoing: () => [],
      incoming: () => [],
      neighbors: () => [],
      outgoingSlugs: () => [],
      incomingSlugs: () => [],
      neighborSlugs: () => [],
      filterNeighbors: () => ({ outgoingSlugs: [], incomingSlugs: [] }),
    },
    assets: [],
    clientEntries: [],
    diagnostics: [],
    generatedOutputs: [],
    folderLocations: new Map(),
    pageRoutes: [],
    pagePaths: [],
  };
}
