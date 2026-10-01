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

function entry(
  slug: string,
  permalink: string,
  options: Partial<ContentManifestEntry> & { published?: boolean } = {},
): ContentManifestEntry {
  return {
    slug,
    permalink,
    publicLocation: { slug, permalink },
    title: slug,
    frontmatter:
      options.published === false ? { publish: false } : { publish: true },
    html: options.html ?? "",
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
    bySlug: new Map(entries.map((entry) => [entry.slug, entry])),
    byContentId: new Map(),
    byPermalink: new Map(entries.map((entry) => [entry.permalink, entry])),
    redirects: new Map(),
    publicRedirects: new Map(),
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
    pagePaths: [],
  };
}
