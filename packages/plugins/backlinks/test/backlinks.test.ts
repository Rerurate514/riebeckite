import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  resolveConfig,
} from "@riebeckite/core";
import { assertGoldenJson } from "@riebeckite/test";
import { createElement, Fragment } from "hono/jsx";
import {
  type BacklinksOptions,
  backlinksPlugin,
  getPublishedBacklinks,
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

function manager(files: Record<string, string>) {
  return new ContentManager(source(files), [], { config: explicitConfig });
}

function resolveTitle(slug: string, title: unknown): string {
  return typeof title === "string" ? title : slug;
}

test("returns published incoming entries with resolved titles", async () => {
  const manifest = await manager({
    "alpha.md": "---\npublish: true\ntitle: Alpha\n---\n# Alpha",
    "beta.md": "---\npublish: true\ntitle: Beta\n---\n# Beta\n\nSee [[alpha]].",
    "gamma.md":
      "---\npublish: true\ntitle: Gamma\n---\n# Gamma\n\nSee [[alpha]].",
  }).getManifest();

  const backlinks = getPublishedBacklinks({
    manifest,
    config: explicitConfig,
    slug: "alpha",
    resolveTitle,
  });

  assert.deepEqual(backlinks, [
    { slug: "beta", permalink: "/beta", title: "Beta" },
    { slug: "gamma", permalink: "/gamma", title: "Gamma" },
  ]);
});

test("skips incoming entries that are not published", async () => {
  const manifest = await manager({
    "alpha.md": "---\npublish: true\ntitle: Alpha\n---\n# Alpha",
    "public.md":
      "---\npublish: true\ntitle: Public\n---\n# Public\n\n[[alpha]]",
    "private.md":
      "---\npublish: false\ntitle: Private\n---\n# Private\n\n[[alpha]]",
    "unflagged.md": "---\ntitle: Unflagged\n---\n# Unflagged\n\n[[alpha]]",
  }).getManifest();

  const backlinks = getPublishedBacklinks({
    manifest,
    config: explicitConfig,
    slug: "alpha",
    resolveTitle,
  });

  assert.deepEqual(
    backlinks.map((backlink) => backlink.slug),
    ["public"],
  );
});

test("passes the slug and raw frontmatter title to the title resolver", async () => {
  const manifest = await manager({
    "alpha.md": "---\npublish: true\n---\n# Alpha",
    "beta.md": "---\npublish: true\ntitle: Beta\n---\n# Beta\n\n[[alpha]]",
  }).getManifest();

  const calls: Array<[string, unknown]> = [];
  const backlinks = getPublishedBacklinks({
    manifest,
    config: explicitConfig,
    slug: "alpha",
    resolveTitle: (slug, title) => {
      calls.push([slug, title]);
      return resolveTitle(slug, title);
    },
  });

  assert.deepEqual(calls, [["beta", "Beta"]]);
  assert.deepEqual(backlinks, [
    { slug: "beta", permalink: "/beta", title: "Beta" },
  ]);
});

test("returns an empty list when nothing links to the target", async () => {
  const manifest = await manager({
    "alpha.md": "---\npublish: true\ntitle: Alpha\n---\n# Alpha",
    "beta.md": "---\npublish: true\ntitle: Beta\n---\n# Beta\n\n[[alpha]]",
  }).getManifest();

  assert.deepEqual(
    getPublishedBacklinks({
      manifest,
      config: explicitConfig,
      slug: "beta",
      resolveTitle,
    }),
    [],
  );
});

test("drops self-links and de-duplicates repeated links from one entry", async () => {
  const manifest = await manager({
    "alpha.md": "---\npublish: true\ntitle: Alpha\n---\n# Alpha",
    "self.md":
      "---\npublish: true\ntitle: Self\n---\n# Self\n\n[[self]] and [[alpha]] and [[alpha]] again",
  }).getManifest();

  assert.deepEqual(
    getPublishedBacklinks({
      manifest,
      config: explicitConfig,
      slug: "self",
      resolveTitle,
    }),
    [],
  );

  const backlinks = getPublishedBacklinks({
    manifest,
    config: explicitConfig,
    slug: "alpha",
    resolveTitle,
  });
  assert.deepEqual(
    backlinks.map((backlink) => backlink.slug),
    ["self"],
  );
});

test("matches a structured link graph", async () => {
  const manifest = await manager({
    "index.md": "---\npublish: true\ntitle: Index\n---\n# Index\n\n[[guide]]",
    "guide.md": "---\npublish: true\ntitle: Guide\n---\n# Guide\n\n[[api]]",
    "api.md": "---\npublish: true\ntitle: API\n---\n# API\n\n[[guide]]",
    "draft.md": "---\ntitle: Draft\n---\n# Draft\n\n[[guide]] and [[api]]",
  }).getManifest();

  assertGoldenJson(
    getPublishedBacklinks({
      manifest,
      config: explicitConfig,
      slug: "guide",
      resolveTitle,
    }),
    new URL("./__golden__/guide-backlinks.json", import.meta.url),
  );
});

test("backlinksPlugin registers its stylesheet and manifest hook", () => {
  const plugin = backlinksPlugin();

  assert.equal(plugin.name, "backlinks");
  assert.equal(typeof plugin.onManifestCreated, "function");
  assert.deepEqual(plugin.assets, [
    {
      pluginName: "backlinks",
      kind: "style",
      moduleSpecifier: "@riebeckite/plugin-backlinks/style.css",
    },
  ]);
});

test("accepts a rendering opt-out", () => {
  const plugin = backlinksPlugin({ render: false });

  assert.deepEqual(plugin.validateOptions?.(plugin.options), []);
  assert.deepEqual(
    plugin.validateOptions?.({ render: "no" } as unknown as BacklinksOptions),
    [{ path: "render", message: "Expected a boolean." }],
  );
});

test("publishes backlinks to the article footer only when present", async () => {
  const manifest = await new ContentManager(
    source({
      "alpha.md": "---\npublish: true\ntitle: Alpha\n---\n# Alpha",
      "beta.md": "---\npublish: true\ntitle: Beta\n---\n[[alpha]]",
    }),
    [],
    { config: explicitConfig, plugins: [backlinksPlugin()] },
  ).getManifest();

  const footer = manifest.bySlug.get("alpha")?.bodySlots?.["article.footer"];
  assert.ok(footer?.includes("rr-backlinks"));
  assert.ok(footer?.includes('href="/beta"'));
  assert.ok(footer?.includes(">Beta</a>"));
  assert.equal(
    manifest.bySlug.get("beta")?.bodySlots?.["article.footer"],
    undefined,
  );
});

test("keeps backlink data available when automatic rendering is disabled", async () => {
  const manifest = await new ContentManager(
    source({
      "alpha.md": "---\npublish: true\ntitle: Alpha\n---\n# Alpha",
      "beta.md": "---\npublish: true\ntitle: Beta\n---\n[[alpha]]",
    }),
    [],
    { config: explicitConfig, plugins: [backlinksPlugin({ render: false })] },
  ).getManifest();

  const alpha = manifest.bySlug.get("alpha");
  assert.equal(alpha?.bodySlots?.["article.footer"], undefined);
  assert.deepEqual(
    getPublishedBacklinks({
      manifest,
      config: explicitConfig,
      slug: "alpha",
      resolveTitle,
    }),
    [{ slug: "beta", permalink: "/beta", title: "Beta" }],
  );
});
