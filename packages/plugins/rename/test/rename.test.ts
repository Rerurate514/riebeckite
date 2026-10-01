import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ContentManifest,
  JsonValue,
  Logger,
  PluginCache,
  PluginManifestContext,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import {
  applyRouteRedirects,
  buildRouteLock,
  collapseRedirects,
  diffRoutes,
  emptyRouteLock,
  hashContent,
  parseRouteLock,
  type RedirectRule,
  type RouteLock,
  type RouteLockRoute,
  renamePlugin,
} from "../index.js";

function route(
  permalink: string,
  contentHash: string,
  id?: string,
): RouteLockRoute {
  return id === undefined
    ? { permalink, contentHash }
    : { permalink, contentHash, id };
}

function lock(
  routes: Record<string, RouteLockRoute>,
  redirects: RedirectRule[] = [],
): RouteLock {
  return { version: 1, routes, redirects };
}

function entry(
  slug: string,
  permalink: string,
  frontmatter: Record<string, unknown>,
  html: string,
) {
  return { slug, permalink, frontmatter, html };
}

test("detects a rename through an exact content hash match", () => {
  const previous = lock({ old: route("/old", "hash-1") });
  const current = lock({ new: route("/new", "hash-1") });

  const result = diffRoutes(previous, current);

  assert.deepEqual(result.added, [
    { from: "/old", to: "/new", status: 308, reason: "rename" },
  ]);
  assert.deepEqual(result.lock.redirects, result.added);
  assert.deepEqual(Object.keys(result.lock.routes), ["new"]);
  assert.deepEqual(result.diagnostics, []);
});

test("prefers frontmatter id evidence over the content hash", () => {
  const previous = lock({ old: route("/old", "hash-old", "note-1") });
  const current = lock({ new: route("/new", "hash-new", "note-1") });

  const result = diffRoutes(previous, current);

  assert.deepEqual(result.added, [
    { from: "/old", to: "/new", status: 308, reason: "id" },
  ]);
});

test("keeps the lock stable when a route is unchanged", () => {
  const previous = lock({ note: route("/note", "hash-1") });
  const current = lock({ note: route("/note", "hash-1") });

  const result = diffRoutes(previous, current);

  assert.deepEqual(result.added, []);
  assert.deepEqual(result.lock.routes, current.routes);
  assert.deepEqual(result.lock.redirects, []);
  assert.deepEqual(result.diagnostics, []);
});

test("emits no redirect and a diagnostic for an ambiguous rename", () => {
  const previous = lock({ old: route("/old", "hash-1") });
  const current = lock({
    a: route("/a", "hash-1"),
    b: route("/b", "hash-1"),
  });

  const result = diffRoutes(previous, current);

  assert.deepEqual(result.added, []);
  assert.deepEqual(result.lock.redirects, []);
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0]?.code, "rename-ambiguous");
  assert.equal(result.diagnostics[0]?.slug, "old");
});

test("reports an unexpected removal with the configured severity", () => {
  const previous = lock({ gone: route("/gone", "hash-1") });
  const current = emptyRouteLock();

  const result = diffRoutes(previous, current, { onUnexpectedRemoval: "info" });

  assert.deepEqual(result.added, []);
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0]?.code, "rename-removed");
  assert.equal(result.diagnostics[0]?.severity, "info");
  assert.deepEqual(result.lock.routes, {});
});

test("collapses permanent redirect chains transitively", () => {
  const previous = lock({ b: route("/b", "hash-b") }, [
    { from: "/a", to: "/b", status: 308, reason: "rename" },
  ]);
  const current = lock({ b: route("/c", "hash-b") });

  const result = diffRoutes(previous, current);

  assert.deepEqual(result.added, [
    { from: "/b", to: "/c", status: 308, reason: "rename" },
  ]);
  assert.deepEqual(result.lock.redirects, [
    { from: "/a", to: "/c", status: 308, reason: "rename" },
    { from: "/b", to: "/c", status: 308, reason: "rename" },
  ]);
});

test("collapseRedirects is idempotent and sorted", () => {
  const rules: RedirectRule[] = [
    { from: "/c", to: "/d", status: 308, reason: "rename" },
    { from: "/a", to: "/b", status: 308, reason: "rename" },
    { from: "/b", to: "/c", status: 301, reason: "id" },
  ];

  const collapsed = collapseRedirects(rules);

  assert.deepEqual(collapsed, [
    { from: "/a", to: "/d", status: 308, reason: "rename" },
    { from: "/b", to: "/d", status: 301, reason: "id" },
    { from: "/c", to: "/d", status: 308, reason: "rename" },
  ]);
  assert.deepEqual(collapseRedirects(collapsed), collapsed);
});

test("excludes non-routable notes from the lock and redirects", () => {
  const entries = [
    entry("pub", "/pub", { publish: true }, "<p>pub</p>"),
    entry("priv", "/priv", { private: true }, "<p>priv</p>"),
  ];

  const current = buildRouteLock(
    entries.filter((item) => item.frontmatter.publish === true),
  );

  assert.deepEqual(Object.keys(current.routes), ["pub"]);
  assert.deepEqual(current.redirects, []);
  assert.equal(JSON.stringify(current).includes("/priv"), false);

  const result = diffRoutes(emptyRouteLock(), current);
  assert.equal(JSON.stringify(result.lock).includes("/priv"), false);
  assert.equal(
    result.lock.redirects.some((rule) => rule.to === "/priv"),
    false,
  );
});

test("never overwrites an existing manifest redirect key", () => {
  const manifest = {
    redirects: new Map([
      ["/old", { path: "/legacy", status: 302 as const, slug: "legacy" }],
    ]),
    byPermalink: new Map([["/new", { slug: "new" }]]),
  };

  const applied = applyRouteRedirects(manifest, [
    { from: "/old", to: "/new", status: 308, reason: "rename" },
  ]);

  assert.deepEqual(applied, []);
  assert.deepEqual(manifest.redirects.get("/old"), {
    path: "/legacy",
    status: 302,
    slug: "legacy",
  });
});

test("applies rename redirects owned by the target entry", () => {
  const manifest = {
    redirects: new Map<
      string,
      { path: string; status: 301 | 302 | 307 | 308; slug: string }
    >(),
    byPermalink: new Map([["/new", { slug: "new" }]]),
  };

  const rules: RedirectRule[] = [
    { from: "/old", to: "/new", status: 308, reason: "rename" },
  ];
  const applied = applyRouteRedirects(manifest, rules);

  assert.deepEqual(applied, rules);
  assert.deepEqual(manifest.redirects.get("/old"), {
    path: "/new",
    status: 308,
    slug: "new",
  });
});

test("produces deterministic, sorted lock serialization", () => {
  const entries = [
    entry("zeta", "/zeta", {}, "<p>z</p>"),
    entry("alpha", "/alpha", {}, "<p>a</p>"),
    entry("mid", "/mid", {}, "<p>m</p>"),
  ];

  const first = buildRouteLock(entries);
  const second = buildRouteLock([...entries].reverse());

  assert.deepEqual(Object.keys(first.routes), ["alpha", "mid", "zeta"]);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.deepEqual(parseRouteLock(JSON.parse(JSON.stringify(first))), first);
});

test("hashContent hashes HTML with sha256", () => {
  assert.equal(
    hashContent("<p>hello</p>"),
    "a5652be1ca864d36d25cfb54a41f384e2de1b3acf7513a925d72ed7258fdc0ae",
  );
  assert.notEqual(hashContent("<p>a</p>"), hashContent("<p>b</p>"));
  assert.match(hashContent("<p>a</p>"), /^[0-9a-f]{64}$/);
});

test("parseRouteLock returns undefined for corrupt or unknown locks", () => {
  assert.equal(parseRouteLock(undefined), undefined);
  assert.equal(parseRouteLock("nope"), undefined);
  assert.equal(
    parseRouteLock({ version: 2, routes: {}, redirects: [] }),
    undefined,
  );
  assert.equal(
    parseRouteLock({ version: 1, routes: {}, redirects: "x" }),
    undefined,
  );
  assert.equal(
    parseRouteLock({
      version: 1,
      routes: { a: { permalink: 1 } },
      redirects: [],
    }),
    undefined,
  );
});

function memoryCache(): PluginCache & { readonly size: number } {
  const values = new Map<string, string>();
  return {
    get size() {
      return values.size;
    },
    async get<T extends JsonValue>(key: string): Promise<T | undefined> {
      const raw = values.get(key);
      return raw === undefined ? undefined : (JSON.parse(raw) as T);
    },
    async set<T extends JsonValue>(key: string, value: T): Promise<void> {
      values.set(key, JSON.stringify(value));
    },
    async delete(key: string): Promise<void> {
      values.delete(key);
    },
    async clear(): Promise<void> {
      values.clear();
    },
  };
}

const noopLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
  child() {
    return noopLogger;
  },
};

function fakeConfig(): ResolvedRiebeckiteConfig {
  return {
    content: { filters: { publishStrategy: "selective" } },
  } as unknown as ResolvedRiebeckiteConfig;
}

function fakeManifest(
  entries: Array<{
    slug: string;
    permalink: string;
    frontmatter: Record<string, unknown>;
    html: string;
  }>,
): ContentManifest {
  const full = entries.map((item) => ({
    ...item,
    publicLocation: { slug: item.slug, permalink: item.permalink },
    title: "",
    publishing:
      item.frontmatter.private === true
        ? { visibility: "draft", routable: false, discoverable: false }
        : { visibility: "public", routable: true, discoverable: true },
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
  }));
  const publicEntries = full.filter((item) => item.publishing.routable);
  return {
    entries: full,
    publicEntries,
    discoverableEntries: publicEntries.filter(
      (item) => item.publishing.discoverable,
    ),
    redirects: new Map(),
    byPermalink: new Map(full.map((item) => [item.permalink, item])),
    byRoutablePermalink: new Map(
      publicEntries.map((item) => [item.permalink, item]),
    ),
  } as unknown as ContentManifest;
}

async function runManifestHook(
  plugin: ReturnType<typeof renamePlugin>,
  manifest: ContentManifest,
  cache: PluginCache,
  diagnostics: unknown[] = [],
): Promise<unknown[]> {
  const context = {
    manifest,
    config: fakeConfig(),
    cache,
    diagnostics,
    logger: noopLogger,
    contentIndex: new Map<string, string>(),
  } as unknown as PluginManifestContext;
  await plugin.onManifestCreated?.(context);
  return diagnostics;
}

test("hook persists the lock and replays redirects across builds", async () => {
  const cache = memoryCache();
  const plugin = renamePlugin();

  const first = fakeManifest([
    { slug: "alpha", permalink: "/a", frontmatter: {}, html: "<p>a</p>" },
  ]);
  await runManifestHook(plugin, first, cache);
  assert.equal(first.redirects.size, 0);

  const second = fakeManifest([
    { slug: "alpha", permalink: "/b", frontmatter: {}, html: "<p>a</p>" },
  ]);
  const diagnostics = await runManifestHook(plugin, second, cache);
  assert.deepEqual(second.redirects.get("/a"), {
    path: "/b",
    status: 308,
    slug: "alpha",
  });
  assert.deepEqual(diagnostics, []);

  // The SSG build rebuilds the manifest; the lock must reproduce redirects.
  const third = fakeManifest([
    { slug: "alpha", permalink: "/b", frontmatter: {}, html: "<p>a</p>" },
  ]);
  await runManifestHook(plugin, third, cache);
  assert.deepEqual(third.redirects.get("/a"), {
    path: "/b",
    status: 308,
    slug: "alpha",
  });
});

test("hook respects existing redirects and never locks private notes", async () => {
  const cache = memoryCache();
  const plugin = renamePlugin();

  await runManifestHook(
    plugin,
    fakeManifest([
      { slug: "alpha", permalink: "/a", frontmatter: {}, html: "<p>a</p>" },
    ]),
    cache,
  );

  const manifest = fakeManifest([
    { slug: "alpha", permalink: "/b", frontmatter: {}, html: "<p>a</p>" },
    {
      slug: "secret",
      permalink: "/secret",
      frontmatter: { private: true },
      html: "<p>s</p>",
    },
  ]);
  manifest.redirects.set("/a", {
    path: "/legacy",
    status: 302,
    slug: "legacy",
  });
  await runManifestHook(plugin, manifest, cache);

  assert.deepEqual(manifest.redirects.get("/a"), {
    path: "/legacy",
    status: 302,
    slug: "legacy",
  });
  assert.equal(manifest.redirects.has("/secret"), false);

  const stored = parseRouteLock(await cache.get<JsonValue>("routes.lock"));
  assert.ok(stored);
  assert.equal(Object.hasOwn(stored.routes, "secret"), false);
});
