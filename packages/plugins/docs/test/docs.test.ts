import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  type ContentSourceEntry,
  definePlugin,
  resolveConfig,
} from "@riebeckite/core";
import { docs } from "../index.js";
import {
  buildDocsNavigation,
  flattenDocsNavigation,
  resolveDocsOptions,
} from "../src/navigation.js";

function memorySource(files: Record<string, string>): ContentSource {
  const entries: ContentSourceEntry[] = Object.keys(files).map((path) => ({
    path,
  }));
  return {
    async scan() {
      return entries;
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

const permalinkPlugin = definePlugin({
  name: "test-permalink",
  resolveContentLocations: ({ entries }) =>
    entries.map((entry) => ({
      slug: entry.slug,
      permalink:
        entry.slug === "docs/guide/install"
          ? "/manual/install"
          : `/${entry.slug}`,
    })),
});

const localizedLocationPlugin = definePlugin({
  name: "test-localized-location",
  resolveContentLocations: ({ entries }) =>
    entries.map((entry) => {
      const language = entry.slug.startsWith("ja/") ? "ja" : "en";
      return {
        slug: entry.slug,
        permalink: `/${entry.slug}`,
        metadata: { "l10n.lang": language },
      };
    }),
});

test("builds a deterministic hierarchy from a docs root", async () => {
  const manager = createManager({
    "docs/index.md": "---\ntitle: Introduction\npublish: true\n---\n# Docs\n",
    "docs/guide/index.md":
      "---\ntitle: Guide\npublish: true\nsidebar:\n  order: 2\n---\n# Guide\n",
    "docs/guide/install.md":
      "---\ntitle: Install\npublish: true\nsidebar:\n  order: 1\n---\n# Install\n",
    "docs/api.md": "---\ntitle: API\npublish: true\n---\n# API\n",
  });

  const manifest = await manager.getManifest();
  const navigation = buildDocsNavigation(
    manifest.publicEntries,
    resolveDocsOptions({ root: "docs" }),
  );

  assert.deepEqual(
    navigation.map((item) => item.title),
    ["Introduction", "Guide", "API"],
  );
  assert.deepEqual(
    navigation[1]?.children.map((item) => item.title),
    ["Install"],
  );
});

test("uses explicit order before title and path fallback", async () => {
  const manager = createManager({
    "docs/beta.md": "---\ntitle: Beta\npublish: true\n---\n# Beta\n",
    "docs/alpha.md": "---\ntitle: Alpha\npublish: true\n---\n# Alpha\n",
    "docs/second.md":
      "---\ntitle: Same\npublish: true\nsidebar:\n  order: 1\n---\n# Same\n",
    "docs/first.md":
      "---\ntitle: Same\npublish: true\nsidebar:\n  order: 1\n---\n# Same\n",
    "docs/zero.md":
      "---\ntitle: Zero\npublish: true\nsidebar:\n  order: 0\n---\n# Zero\n",
  });

  const manifest = await manager.getManifest();
  const sequence = flattenDocsNavigation(
    buildDocsNavigation(
      manifest.publicEntries,
      resolveDocsOptions({ root: "docs" }),
    ),
  );

  assert.deepEqual(
    sequence.map((item) => item.slug),
    ["docs/zero", "docs/first", "docs/second", "docs/alpha", "docs/beta"],
  );
});

test("excludes hidden, unpublished, and outside-root entries", async () => {
  const manager = createManager({
    "docs/index.md": "---\ntitle: Home\npublish: true\n---\n# Home\n",
    "docs/hidden.md":
      "---\ntitle: Hidden\npublish: true\nsidebar:\n  hidden: true\n---\n# Hidden\n",
    "docs/draft.md": "---\ntitle: Draft\npublish: false\n---\n# Draft\n",
    "notes/public.md": "---\ntitle: Note\npublish: true\n---\n# Note\n",
  });

  const manifest = await manager.getManifest();
  const home = manifest.bySlug.get("docs/index");
  assert.ok(home?.bodySlots?.["article.aside"]?.includes("Home"));
  assert.equal(home?.bodySlots?.["article.aside"]?.includes("Hidden"), false);
  assert.equal(home?.bodySlots?.["article.aside"]?.includes("Draft"), false);
  assert.equal(home?.bodySlots?.["article.aside"]?.includes("Note"), false);
  assert.equal(manifest.bySlug.get("notes/public")?.bodySlots, undefined);
});

test("uses resolved public URLs for sidebar and previous-next", async () => {
  const manager = createManager({
    "docs/index.md": "---\ntitle: Home\npublish: true\n---\n# Home\n",
    "docs/guide/install.md":
      "---\ntitle: Install\npublish: true\n---\n# Install\n",
  });

  const manifest = await manager.getManifest();
  const install = manifest.bySlug.get("docs/guide/install");

  assert.match(
    install?.bodySlots?.["article.aside"] ?? "",
    /href="\/manual\/install"/,
  );
  assert.match(
    install?.bodySlots?.["article.aside"] ?? "",
    /aria-current="page"/,
  );
  assert.match(
    install?.bodySlots?.["article.footer"] ?? "",
    /href="\/docs\/index"/,
  );
});

test("isolates multiple plugin instances", async () => {
  const config = resolveConfig({
    site: { title: "Test" },
    plugins: [
      permalinkPlugin,
      docs({ root: "docs" }),
      docs({ root: "guides" }),
    ],
  });
  const manager = new ContentManager(
    memorySource({
      "docs/a.md": "---\ntitle: Docs A\npublish: true\n---\n# A\n",
      "guides/b.md": "---\ntitle: Guides B\npublish: true\n---\n# B\n",
    }),
    [],
    { config },
  );

  const manifest = await manager.getManifest();
  assert.equal(
    manifest.bySlug
      .get("docs/a")
      ?.bodySlots?.["article.aside"]?.includes("Guides B"),
    false,
  );
  assert.equal(
    manifest.bySlug
      .get("guides/b")
      ?.bodySlots?.["article.aside"]?.includes("Docs A"),
    false,
  );
});

test("keeps localized docs navigation within the current language", async () => {
  const config = resolveConfig({
    site: { title: "Test" },
    plugins: [localizedLocationPlugin, docs({ root: "docs" })],
  });
  const manager = new ContentManager(
    memorySource({
      "docs/index.md": "---\ntitle: English Home\npublish: true\n---\n# Home\n",
      "docs/install.md": "---\ntitle: Install\npublish: true\n---\n# Install\n",
      "ja/docs/index.md":
        "---\ntitle: 日本語 Home\npublish: true\n---\n# Home\n",
      "ja/docs/install.md":
        "---\ntitle: インストール\npublish: true\n---\n# Install\n",
    }),
    [],
    { config },
  );

  const manifest = await manager.getManifest();
  const english =
    manifest.bySlug.get("docs/index")?.bodySlots?.["article.aside"] ?? "";
  const japanese =
    manifest.bySlug.get("ja/docs/index")?.bodySlots?.["article.aside"] ?? "";

  assert.match(english, /English Home/);
  assert.match(english, /href="\/docs\/install"/);
  assert.doesNotMatch(english, /インストール/);
  assert.match(japanese, /日本語 Home/);
  assert.match(japanese, /href="\/ja\/docs\/install"/);
  assert.doesNotMatch(japanese, /English Home/);
});

test("renders accessible navigation semantics", async () => {
  const manager = createManager({
    "docs/index.md": "---\ntitle: Home\npublish: true\n---\n# Home\n",
    "docs/next.md":
      "---\ntitle: Next\npublish: true\nsidebar:\n  collapsed: false\n---\n# Next\n",
    "docs/next/child.md": "---\ntitle: Child\npublish: true\n---\n# Child\n",
  });

  const manifest = await manager.getManifest();
  const home = manifest.bySlug.get("docs/index");
  const html = `${home?.bodySlots?.["article.aside"] ?? ""}${home?.bodySlots?.["article.footer"] ?? ""}`;

  assert.match(
    html,
    /<nav class="rb-docs-sidebar" aria-label="Docs navigation"/,
  );
  assert.match(html, /aria-current="page"/);
  assert.match(
    html,
    /<nav class="rb-docs-prev-next" aria-label="Previous and next docs pages"/,
  );
  assert.match(html, /data-docs-collapsed="false"/);
});

test("keeps the current branch expanded when a section is collapsed", async () => {
  const manager = createManager({
    "docs/index.md": "---\ntitle: Home\npublish: true\n---\n# Home\n",
    "docs/plugins/index.md":
      "---\ntitle: Plugins\npublish: true\nsidebar:\n  collapsed: true\n---\n# Plugins\n",
    "docs/plugins/search.md":
      "---\ntitle: Search\npublish: true\n---\n# Search\n",
  });

  const manifest = await manager.getManifest();
  const home = manifest.bySlug.get("docs/index");
  const search = manifest.bySlug.get("docs/plugins/search");

  assert.match(
    home?.bodySlots?.["article.aside"] ?? "",
    /data-docs-collapsed="true"/,
  );
  assert.match(
    search?.bodySlots?.["article.aside"] ?? "",
    /data-docs-collapsed="false"/,
  );
});

function createManager(files: Record<string, string>): ContentManager {
  const config = resolveConfig({
    site: { title: "Test" },
    plugins: [permalinkPlugin, docs({ root: "docs" })],
  });
  return new ContentManager(memorySource(files), [], { config });
}
