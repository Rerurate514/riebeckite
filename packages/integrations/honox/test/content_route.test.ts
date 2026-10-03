import assert from "node:assert/strict";
import test from "node:test";
import type { ContentManifest, ContentManifestEntry } from "@riebeckite/core";
import { resolveContentRoute, riebeckiteSsgParams } from "../server.ts";

test("content redirects resolve only when their target is routable", () => {
  const manifest = manifestOf([
    entry("public", "/new", true),
    entry("draft", "/private", false),
  ]);
  manifest.redirects.set("/old-private", {
    path: "/old-private",
    status: 308,
    slug: "draft",
  });
  manifest.publicRedirects.set("/old", {
    path: "/old",
    status: 308,
    slug: "public",
  });

  assert.deepEqual(resolveContentRoute(manifest, "/old"), {
    kind: "redirect",
    location: "/new",
    status: 308,
  });
  assert.equal(resolveContentRoute(manifest, "/old-private"), null);
});

test("SSG enumerates affected public redirect routes", async () => {
  const manifest = manifestOf([entry("public", "/new", true)]);
  manifest.publicRedirects.set("/old/", {
    path: "/old/",
    status: 308,
    slug: "public",
  });

  const params = await riebeckiteSsgParams({
    getManifest: async () => manifest,
    getOutputChangeSet: async () => ({
      fullRegenerationRequired: false,
      affected: [
        {
          kind: "redirect" as const,
          path: "old/index.html",
          producer: "content:public:redirect",
          dependencies: [],
        },
      ],
      removed: [],
      unchanged: [],
      candidateOutputCount: 1,
      affectedOutputCount: 1,
      removedOutputCount: 0,
      unchangedOutputCount: 0,
    }),
    getPagePaths: async () => [],
  });

  assert.deepEqual(params, [{ slug: "old/" }]);
});

function entry(
  slug: string,
  permalink: string,
  routable: boolean,
): ContentManifestEntry {
  return {
    slug,
    permalink,
    publicLocation: { slug, permalink },
    title: slug,
    aliases: [],
    frontmatter: { publish: routable },
    publishing: {
      visibility: routable ? "public" : "draft",
      routable,
      discoverable: routable,
    },
    html: "",
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
  };
}

function manifestOf(entries: ContentManifestEntry[]): ContentManifest {
  const publicEntries = entries.filter((entry) => entry.publishing.routable);
  return {
    entries,
    publicEntries,
    discoverableEntries: publicEntries,
    bySlug: new Map(entries.map((entry) => [entry.slug, entry])),
    byContentId: new Map(),
    byAlias: new Map(),
    byPermalink: new Map(entries.map((entry) => [entry.permalink, entry])),
    byRoutablePermalink: new Map(
      publicEntries.map((entry) => [entry.permalink, entry]),
    ),
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
    folderLocations: new Map(),
    pageRoutes: [],
    pagePaths: [],
  };
}
