import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  type ContentSourceEntry,
  createPublicContentView,
  definePlugin,
  resolveConfig,
} from "@riebeckite/core";
import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import {
  DocsPrevNext,
  DocsSidebar,
  docs,
  getDocsNavigation,
} from "../index.js";
import {
  buildDocsNavigation,
  flattenDocsNavigation,
  resolveDocsOptions,
} from "../src/navigation.js";
import { renderDocsPrevNext, renderDocsSidebar } from "../src/render.js";

const style = readFileSync(new URL("../style.css", import.meta.url), "utf8");

(globalThis as { React?: unknown }).React = { createElement, Fragment };

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
      const localized = entry.slug.endsWith(".ja");
      const base = localized ? entry.slug.slice(0, -".ja".length) : entry.slug;
      return {
        slug: entry.slug,
        permalink: localized ? `/ja/${base}` : `/${base}`,
        language: localized ? "ja" : "en",
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

test("treats README and index as equivalent section entries", async () => {
  const manager = createManager({
    "docs/README.md": "---\ntitle: Introduction\npublish: true\n---\n# Docs\n",
    "docs/guide/README.md": "---\ntitle: Guide\npublish: true\n---\n# Guide\n",
    "docs/guide/install.md":
      "---\ntitle: Install\npublish: true\n---\n# Install\n",
  });

  const manifest = await manager.getManifest();
  const navigation = buildDocsNavigation(
    manifest.publicEntries,
    resolveDocsOptions({ root: "docs" }),
  );

  assert.deepEqual(
    navigation.map((item) => ({ title: item.title, href: item.href })),
    [
      { title: "Introduction", href: "/docs/README" },
      { title: "Guide", href: "/docs/guide/README" },
    ],
  );
  assert.equal(navigation[1]?.children[0]?.href, "/manual/install");
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

  const navigation = buildDocsNavigation(
    manifest.publicEntries,
    resolveDocsOptions({ root: "docs" }),
  );
  const sidebarHtml = renderDocsSidebar({
    items: navigation,
    currentPermalink: home?.permalink ?? "",
    label: "Docs navigation",
  });

  assert.match(sidebarHtml, /Home/);
  assert.doesNotMatch(sidebarHtml, /Hidden/);
  assert.doesNotMatch(sidebarHtml, /Draft/);
  assert.doesNotMatch(sidebarHtml, /Note/);
});

test("uses resolved public URLs for sidebar and previous-next", async () => {
  const manager = createManager({
    "docs/index.md": "---\ntitle: Home\npublish: true\n---\n# Home\n",
    "docs/guide/install.md":
      "---\ntitle: Install\npublish: true\n---\n# Install\n",
  });

  const manifest = await manager.getManifest();
  const install = manifest.bySlug.get("docs/guide/install");

  const navigation = buildDocsNavigation(
    manifest.publicEntries,
    resolveDocsOptions({ root: "docs" }),
  );
  const sidebarHtml = renderDocsSidebar({
    items: navigation,
    currentPermalink: install?.permalink ?? "",
    label: "Docs navigation",
  });
  const prevNextHtml = renderDocsPrevNext(
    flattenDocsNavigation(navigation),
    install?.permalink ?? "",
  );

  assert.match(sidebarHtml, /href="\/manual\/install"/);
  assert.match(sidebarHtml, /aria-current="page"/);
  assert.match(prevNextHtml, /href="\/docs\/index"/);
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

  const docsNavigation = buildDocsNavigation(
    manifest.publicEntries.filter((e) => e.slug?.startsWith("docs/")),
    resolveDocsOptions({ root: "docs" }),
  );
  const guidesNavigation = buildDocsNavigation(
    manifest.publicEntries.filter((e) => e.slug?.startsWith("guides/")),
    resolveDocsOptions({ root: "guides" }),
  );

  const docsASidebarHtml = renderDocsSidebar({
    items: docsNavigation,
    currentPermalink: manifest.bySlug.get("docs/a")?.permalink ?? "",
    label: "Docs navigation",
  });
  assert.doesNotMatch(docsASidebarHtml, /Guides B/);

  const guidesBSidebarHtml = renderDocsSidebar({
    items: guidesNavigation,
    currentPermalink: manifest.bySlug.get("guides/b")?.permalink ?? "",
    label: "Docs navigation",
  });
  assert.doesNotMatch(guidesBSidebarHtml, /Docs A/);
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
      "docs/index.ja.md":
        "---\ntitle: 日本語 Home\npublish: true\n---\n# Home\n",
      "docs/install.ja.md":
        "---\ntitle: インストール\npublish: true\n---\n# Install\n",
    }),
    [],
    { config },
  );

  const manifest = await manager.getManifest();
  const view = createPublicContentView(manifest);
  const options = resolveDocsOptions({ root: "docs" });

  const englishNavigation = await getDocsNavigation({
    view,
    entrySlug: "docs/index",
    options,
  });
  const japaneseNavigation = await getDocsNavigation({
    view,
    entrySlug: "docs/index.ja",
    options,
  });

  const englishSidebar = renderDocsSidebar({
    items: englishNavigation,
    currentPermalink: manifest.bySlug.get("docs/index")?.permalink ?? "",
    label: "Docs navigation",
  });
  const japaneseSidebar = renderDocsSidebar({
    items: japaneseNavigation,
    currentPermalink: manifest.bySlug.get("docs/index.ja")?.permalink ?? "",
    label: "Docs navigation",
  });

  assert.match(englishSidebar, /English Home/);
  assert.match(englishSidebar, /href="\/docs\/install"/);
  assert.doesNotMatch(englishSidebar, /インストール/);
  assert.match(japaneseSidebar, /日本語 Home/);
  assert.match(japaneseSidebar, /href="\/ja\/docs\/install"/);
  assert.doesNotMatch(japaneseSidebar, /English Home/);
});

test("localizes the previous and next labels by page language", async () => {
  const config = resolveConfig({
    site: { title: "Test" },
    plugins: [localizedLocationPlugin, docs({ root: "docs" })],
  });
  const manager = new ContentManager(
    memorySource({
      "docs/index.md":
        "---\ntitle: Home\npublish: true\nsidebar:\n  order: 1\n---\n# Home\n",
      "docs/install.md":
        "---\ntitle: Install\npublish: true\nsidebar:\n  order: 2\n---\n# Install\n",
      "docs/guide.md":
        "---\ntitle: Guide\npublish: true\nsidebar:\n  order: 3\n---\n# Guide\n",
      "docs/index.ja.md":
        "---\ntitle: ホーム\npublish: true\nsidebar:\n  order: 1\n---\n# Home\n",
      "docs/install.ja.md":
        "---\ntitle: インストール\npublish: true\nsidebar:\n  order: 2\n---\n# Install\n",
      "docs/guide.ja.md":
        "---\ntitle: ガイド\npublish: true\nsidebar:\n  order: 3\n---\n# Guide\n",
    }),
    [],
    { config },
  );

  const manifest = await manager.getManifest();
  const view = createPublicContentView(manifest);
  const options = resolveDocsOptions({ root: "docs" });
  const englishHistory = flattenDocsNavigation(
    await getDocsNavigation({ view, entrySlug: "docs/index", options }),
  );
  const japaneseHistory = flattenDocsNavigation(
    await getDocsNavigation({ view, entrySlug: "docs/index.ja", options }),
  );
  const currentEnglish = englishHistory[Math.floor(englishHistory.length / 2)];
  const currentJapanese =
    japaneseHistory[Math.floor(japaneseHistory.length / 2)];
  const english = renderDocsPrevNext(
    englishHistory,
    currentEnglish?.href ?? "",
    "en",
  );
  const japanese = renderDocsPrevNext(
    japaneseHistory,
    currentJapanese?.href ?? "",
    "ja",
  );

  assert.match(english, /aria-label="Previous and next docs pages"/);
  assert.match(english, />Previous</);
  assert.match(english, />Next</);
  assert.match(japanese, /aria-label="前後のドキュメント"/);
  assert.match(japanese, />前へ</);
  assert.match(japanese, />次へ</);
  assert.doesNotMatch(japanese, /Previous|Next/);
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

  const navigation = buildDocsNavigation(
    manifest.publicEntries,
    resolveDocsOptions({ root: "docs" }),
  );
  const sidebarHtml = renderDocsSidebar({
    items: navigation,
    currentPermalink: home?.permalink ?? "",
    label: "Docs navigation",
  });
  const prevNextHtml = renderDocsPrevNext(
    flattenDocsNavigation(navigation),
    home?.permalink ?? "",
  );
  const html = `${sidebarHtml}${prevNextHtml}`;

  assert.match(
    html,
    /<nav class="rb-docs-sidebar" aria-label="Docs navigation"/,
  );
  assert.match(
    html,
    /<details class="rb-docs-sidebar-details" data-docs-sidebar-details open>/,
  );
  assert.match(
    html,
    /<summary class="rb-docs-sidebar-summary">Docs navigation<\/summary>/,
  );
  assert.match(html, /aria-current="page"/);
  assert.match(
    html,
    /<nav class="rb-docs-prev-next" aria-label="Previous and next docs pages"/,
  );
  assert.match(html, /data-docs-collapsed="false"/);
});

test("component rendering uses the documented previous-next DOM contract", async () => {
  const html = renderToString(
    await DocsPrevNext({
      previous: {
        href: "/docs/previous",
        slug: "previous",
        title: "Previous page",
      },
      next: {
        href: "/docs/next",
        slug: "next",
        title: "A long next documentation page",
      },
    }),
  );

  assert.match(html, /class="rb-docs-prev-next"/);
  assert.match(html, /data-docs-prev-next/);
  assert.match(
    html,
    /class="rb-docs-prev-next__link rb-docs-prev-next__link--previous"/,
  );
  assert.match(html, /class="rb-docs-prev-next__label">Previous/);
  assert.match(
    style,
    /\.rb-docs-prev-next__link\s*\{[^}]*overflow-wrap:\s*anywhere/,
  );
});

test("component rendering uses the documented docs sidebar DOM contract", async () => {
  const html = renderToString(
    await DocsSidebar({
      items: [
        {
          title: "Guide",
          href: "/docs/guide",
          children: [
            {
              title: "Child",
              href: "/docs/guide/child",
              children: [],
            },
          ],
        },
        { title: "Section", children: [] },
      ],
      currentPermalink: "/docs/guide/child",
      label: "Documentation",
    }),
  );

  assert.match(
    html,
    /<details class="rb-docs-sidebar-details" data-docs-sidebar-details="true" open=""/,
  );
  assert.match(
    html,
    /<summary class="rb-docs-sidebar-summary">Documentation<\/summary>/,
  );
  assert.match(
    html,
    /<nav class="rb-docs-sidebar" aria-label="Documentation" data-docs-sidebar/,
  );
  assert.match(html, /rb-docs-sidebar__list--level-1/);
  assert.match(html, /rb-docs-sidebar__list--level-2/);
  assert.match(html, /rb-docs-sidebar__section/);
  assert.match(html, /aria-current="page"/);
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

  const navigation = buildDocsNavigation(
    manifest.publicEntries,
    resolveDocsOptions({ root: "docs" }),
  );
  const homeSidebarHtml = renderDocsSidebar({
    items: navigation,
    currentPermalink: home?.permalink ?? "",
    label: "Docs navigation",
  });
  const searchSidebarHtml = renderDocsSidebar({
    items: navigation,
    currentPermalink: search?.permalink ?? "",
    label: "Docs navigation",
  });

  assert.match(homeSidebarHtml, /data-docs-collapsed="true"/);
  assert.match(searchSidebarHtml, /data-docs-collapsed="false"/);
});

test("registers the style asset and the collapsible sidebar client entry", () => {
  const plugin = docs({ root: "docs" });

  assert.deepEqual(plugin.assets, [
    {
      pluginName: "docs",
      kind: "style",
      moduleSpecifier: "@riebeckite/plugin-docs/style.css",
    },
  ]);
  assert.deepEqual(plugin.clientEntries, [
    {
      pluginName: "docs",
      moduleSpecifier: "@riebeckite/plugin-docs/client",
      exportName: "initDocsSidebar",
    },
  ]);
});

test("collapses the sidebar below the desktop rail breakpoint", () => {
  assert.match(style, /--rb-docs-sidebar-collapsible: 1;/);
  assert.match(
    style,
    /@media \(min-width: 88rem\) \{[\s\S]*?--rb-docs-sidebar-collapsible: 0;[\s\S]*?\.rb-docs-sidebar-summary \{[\s\S]*?display: none;/,
  );
});

function createManager(files: Record<string, string>): ContentManager {
  const config = resolveConfig({
    site: { title: "Test" },
    plugins: [permalinkPlugin, docs({ root: "docs" })],
  });
  return new ContentManager(memorySource(files), [], { config });
}
