import assert from "node:assert/strict";
import test from "node:test";
import type {
  ContentManifest,
  ContentManifestEntry,
  PluginHeadTag,
  ResolvedPluginPage,
} from "@riebeckite/core";
import type { Context } from "hono";
import {
  applyRiebeckiteRouteContext,
  resolveContentRoute,
  resolveRiebeckiteContentRequest,
  riebeckiteSsgParams,
} from "../server.ts";

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

test("resolveContentRoute keeps the trailing-slash contract", () => {
  const manifest = manifestOf([
    entry("page", "/page", true),
    entry("folder", "/folder/", true),
  ]);

  assert.deepEqual(resolveContentRoute(manifest, "/page"), {
    kind: "content",
    entry: manifest.entries[0],
  });
  assert.deepEqual(resolveContentRoute(manifest, "/folder/"), {
    kind: "content",
    entry: manifest.entries[1],
  });
  assert.equal(resolveContentRoute(manifest, "/folder"), null);
  assert.equal(resolveContentRoute(manifest, "/missing"), null);
});

test("applyRiebeckiteRouteContext assigns content language and head tags", () => {
  const contentEntry = entry("public", "/new", true);
  contentEntry.publicLocation.language = "ja";
  contentEntry.headTags = [
    { tag: "meta", attrs: { name: "description", content: "x" } },
  ] as PluginHeadTag[];

  const { context, variables } = requestContext({ path: "/new" });
  applyRiebeckiteRouteContext(context, {
    kind: "content",
    entry: contentEntry,
  });

  assert.equal(variables.get("htmlLanguage"), "ja");
  assert.deepEqual(variables.get("headTags"), contentEntry.headTags);
});

test("applyRiebeckiteRouteContext assigns plugin page language and head tags", () => {
  const page = pluginPage({
    language: "ja",
    headTags: [{ tag: "link", attrs: { rel: "canonical", href: "/docs" } }],
  });

  const { context, variables } = requestContext({ path: "/docs" });
  applyRiebeckiteRouteContext(context, { kind: "page", page });

  assert.equal(variables.get("htmlLanguage"), "ja");
  assert.deepEqual(variables.get("headTags"), page.headTags);
});

test("resolveRiebeckiteContentRequest resolves content and loads its body", async () => {
  const manifest = manifestOf([entry("public", "/new", true)]);
  const { context, variables } = requestContext({ slug: "new", path: "/new" });

  const resolved = await resolveRiebeckiteContentRequest(
    context,
    contentStub({ manifest }),
  );

  assert.equal(resolved.kind, "content");
  if (resolved.kind !== "content") return;
  assert.equal(resolved.entry.slug, "public");
  assert.equal(resolved.post.html, "<p>public</p>");
  assert.equal(variables.get("htmlLanguage"), undefined);
});

test("resolveRiebeckiteContentRequest resolves a plugin page and assigns context", async () => {
  const page = pluginPage({ language: "ja" });
  const { context, variables } = requestContext({
    slug: "docs",
    path: "/docs",
  });

  const resolved = await resolveRiebeckiteContentRequest(
    context,
    contentStub({ manifest: manifestOf([]), page }),
  );

  assert.equal(resolved.kind, "page");
  if (resolved.kind !== "page") return;
  assert.equal(resolved.page.pathname, "/docs");
  assert.equal(variables.get("htmlLanguage"), "ja");
});

test("resolveRiebeckiteContentRequest returns the redirect response", async () => {
  const manifest = manifestOf([entry("public", "/new", true)]);
  manifest.publicRedirects.set("/old", {
    path: "/old",
    status: 308,
    slug: "public",
  });
  const { context } = requestContext({ slug: "old", path: "/old" });

  const resolved = await resolveRiebeckiteContentRequest(
    context,
    contentStub({ manifest }),
  );

  assert.equal(resolved.kind, "response");
  if (resolved.kind !== "response") return;
  const response = await resolved.response;
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "/new");
});

test("resolveRiebeckiteContentRequest returns not found for unknown, missing and extension paths", async () => {
  const manifest = manifestOf([entry("public", "/new", true)]);

  for (const options of [
    { slug: "missing", path: "/missing" },
    { slug: "file.md", path: "/file.md" },
    { slug: undefined, path: "/" },
  ]) {
    const { context } = requestContext(options);
    const resolved = await resolveRiebeckiteContentRequest(
      context,
      contentStub({ manifest }),
    );
    assert.equal(resolved.kind, "response");
    if (resolved.kind !== "response") continue;
    assert.equal((await resolved.response).status, 404);
  }
});

test("riebeniteSsgParams enumerates public content, redirects and plugin pages", async () => {
  const manifest = manifestOf([
    entry("home", "/", true),
    entry("a", "/a", true),
    entry("b", "/b/", true),
    entry("draft", "/draft", false),
  ]);
  manifest.publicRedirects.set("/old/", {
    path: "/old/",
    status: 308,
    slug: "a",
  });

  const params = await riebeckiteSsgParams({
    getManifest: async () => manifest,
    getOutputChangeSet: async () => ({
      fullRegenerationRequired: true,
      affected: [],
      removed: [],
      unchanged: [],
      candidateOutputCount: 0,
      affectedOutputCount: 0,
      removedOutputCount: 0,
      unchangedOutputCount: 0,
    }),
    getPagePaths: async () => ["/docs/", "/"],
  });

  assert.deepEqual(params, [
    { slug: "a" },
    { slug: "b/" },
    { slug: "old/" },
    { slug: "docs/" },
  ]);
});

function requestContext(options: { slug?: string; path: string }) {
  const variables = new Map<string, unknown>();
  const context = {
    req: {
      param: (_name: string) => options.slug,
      path: options.path,
    },
    set: (key: string, value: unknown) => {
      variables.set(key, value);
    },
    notFound: () => new Response("not found", { status: 404 }),
    redirect: (location: string, status: number) =>
      new Response(null, { status, headers: { location } }),
  };
  return { context: context as unknown as Context, variables };
}

function contentStub(options: {
  manifest: ContentManifest;
  page?: ResolvedPluginPage | null;
}) {
  return {
    resolvePage: async () => options.page ?? null,
    getManifest: async () => options.manifest,
    getProcessedContent: async (slug: string) => ({
      html: `<p>${slug}</p>`,
      frontmatter: {},
    }),
  } as unknown as Parameters<typeof resolveRiebeckiteContentRequest>[1];
}

function pluginPage(
  overrides: Partial<ResolvedPluginPage> = {},
): ResolvedPluginPage {
  return {
    type: "demo",
    pluginName: "demo-plugin",
    pathname: "/docs",
    body: "<p>page body</p>",
    ...overrides,
  };
}

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
