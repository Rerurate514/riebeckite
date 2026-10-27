import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  ContentManifest,
  PluginHeadTag,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { createPublicContentView, resolveConfig } from "@riebeckite/core";
import { SiteProvider } from "@riebeckite/ui";
import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";

import {
  PluginHeadTags,
  RiebeckiteHead,
  ThemeRoot,
  themeRootAttributes,
} from "../src/ui/primitives.tsx";

(globalThis as { React?: unknown }).React = { createElement, Fragment };

type ResolvedTheme = ResolvedRiebeckiteConfig["theme"];

const manifest: ContentManifest = {
  entries: [],
  publicEntries: [],
  discoverableEntries: [],
  bySlug: new Map(),
  byContentId: new Map(),
  byAlias: new Map(),
  byPermalink: new Map(),
  byRoutablePermalink: new Map(),
  redirects: new Map(),
  publicRedirects: new Map(),
  byTag: new Map(),
  byAsset: new Map(),
  outgoingLinks: new Map(),
  incomingLinks: new Map(),
  contentIndex: new Map(),
  graph: {
    nodes: () => [],
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

function theme(overrides: Partial<ResolvedTheme> = {}): ResolvedTheme {
  return {
    name: "riebeckite",
    colorMode: "system",
    layout: "article",
    stylesheets: [],
    settings: { values: {}, attributes: {}, style: "" },
    styles: [],
    ...overrides,
  };
}

function renderHead(
  overrides: Partial<Parameters<typeof RiebeckiteHead>[0]> = {},
): string {
  return renderToString(
    RiebeckiteHead({ title: "Site Title", prod: false, ...overrides }),
  );
}

function assertInOrder(html: string, markers: readonly string[]): void {
  let previous = -1;
  for (const marker of markers) {
    const index = html.indexOf(marker);
    assert.ok(index >= 0, `expected ${marker} in ${html}`);
    assert.ok(index > previous, `expected ${marker} after the previous marker`);
    previous = index;
  }
}

test("RiebeckiteHead renders the standard head elements in order", () => {
  assertInOrder(renderHead(), [
    '<meta charset="utf-8"',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0"',
    "<title>Site Title</title>",
    '<link rel="icon" href="/favicon.ico"',
    "data-rb-color-mode",
    'href="/app/style.css"',
    'src="/app/client.ts"',
  ]);
});

test("RiebeckiteHead renders the default title", () => {
  assert.match(renderHead({ title: "My Blog" }), /<title>My Blog<\/title>/);
});

test("RiebeckiteHead renders a custom favicon path", () => {
  assert.match(
    renderHead({ faviconHref: "/brand/icon.svg" }),
    /<link rel="icon" href="\/brand\/icon.svg"/,
  );
});

test("RiebeckiteHead omits the favicon when faviconHref is null", () => {
  assert.doesNotMatch(renderHead({ faviconHref: null }), /rel="icon"/);
});

test("RiebeckiteHead renders custom stylesheet entries in order", () => {
  const html = renderHead({
    stylesheets: ["/app/theme.css", "/app/print.css"],
  });

  assertInOrder(html, ["/app/theme.css", "/app/print.css"]);
  assert.doesNotMatch(html, /\/app\/style\.css/);
});

test("RiebeckiteHead omits the client entry when clientSrc is null", () => {
  assert.doesNotMatch(
    renderHead({ clientSrc: null }),
    /src="\/app\/client\.ts"/,
  );
});

test("RiebeckiteHead omits the color-mode bootstrap when disabled", () => {
  assert.doesNotMatch(
    renderHead({ colorModeScript: false }),
    /data-rb-color-mode/,
  );
});

test("RiebeckiteHead renders with zero head tags", () => {
  assert.doesNotMatch(renderHead({ headTags: [] }), /custom-tag/);
});

test("RiebeckiteHead renders meta, link, and script head tags", () => {
  const tags: PluginHeadTag[] = [
    { tag: "meta", attrs: { name: "description", content: "Desc" } },
    { tag: "link", attrs: { rel: "canonical", href: "https://example.com" } },
    {
      tag: "script",
      attrs: { type: "application/ld+json" },
      children: '{"@type":"WebSite"}',
    },
  ];
  const html = renderHead({ headTags: tags });

  assert.match(html, /<meta name="description" content="Desc"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/example.com"/);
  assert.match(
    html,
    /<script type="application\/ld\+json" data-riebeckite-head="page">\{"@type":"WebSite"\}<\/script>/,
  );
  assert.match(html, /data-riebeckite-head="page"/);
});

test("PluginHeadTags marks metadata as page-owned but not executable scripts", () => {
  const html = renderToString(
    PluginHeadTags({
      tags: [
        { tag: "meta", attrs: { name: "plugin", content: "value" } },
        { tag: "link", attrs: { rel: "alternate", href: "/plugin" } },
        { tag: "script", attrs: { src: "/plugin.js" } },
      ],
    }),
  );

  assert.equal(html.match(/data-riebeckite-head="page"/g)?.length, 2);
  assert.doesNotMatch(html, /<script[^>]*data-riebeckite-head/);
});

test("RiebeckiteHead renders a script head tag without children", () => {
  const html = renderHead({
    headTags: [{ tag: "script", attrs: { src: "/app/plugin.js" } }],
  });

  assert.match(html, /<script src="\/app\/plugin.js"><\/script>/);
});

test("RiebeckiteHead preserves multiple head tags in order", () => {
  const html = renderHead({
    headTags: [
      { tag: "meta", attrs: { name: "first", content: "1" } },
      { tag: "meta", attrs: { name: "second", content: "2" } },
    ],
  });

  assertInOrder(html, ['name="first"', 'name="second"']);
});

test("RiebeckiteHead places head tags after stylesheets and before the client entry", () => {
  const html = renderHead({
    headTags: [{ tag: "meta", attrs: { name: "custom", content: "value" } }],
  });

  assertInOrder(html, [
    'href="/app/style.css"',
    'name="custom"',
    'src="/app/client.ts"',
  ]);
});

test("RiebeckiteHead appends Site head children after the standard elements", () => {
  const html = renderHead({
    children: createElement("meta", { name: "custom", content: "value" }),
  });

  assertInOrder(html, [
    'src="/app/client.ts"',
    '<meta name="custom" content="value"',
  ]);
});

test("PluginHeadTags renders nothing without tags", () => {
  assert.equal(renderToString(PluginHeadTags({})), "");
  assert.equal(renderToString(PluginHeadTags({ tags: [] })), "");
});

test("themeRootAttributes derives the reserved attributes", () => {
  assert.deepEqual(themeRootAttributes(theme()), {
    "data-rb-theme": "riebeckite",
    "data-rb-mode": undefined,
    "data-rb-layout": "article",
  });
});

test("themeRootAttributes sets data-rb-mode for explicit light and dark modes", () => {
  assert.equal(
    themeRootAttributes(theme({ colorMode: "light" }))["data-rb-mode"],
    "light",
  );
  assert.equal(
    themeRootAttributes(theme({ colorMode: "dark" }))["data-rb-mode"],
    "dark",
  );
});

test("themeRootAttributes passes through schema-derived data attributes", () => {
  const attributes = themeRootAttributes(
    theme({
      settings: {
        values: {},
        attributes: { "data-rb-setting-density": "compact" },
        style: "",
      },
    }),
  );

  assert.equal(attributes["data-rb-setting-density"], "compact");
});

test("themeRootAttributes derives theme name and layout", () => {
  const attributes = themeRootAttributes(
    theme({
      name: "minimal",
      layout: "sidebar",
    }),
  );

  assert.equal(attributes["data-rb-theme"], "minimal");
  assert.equal(attributes["data-rb-layout"], "sidebar");
});

test("ThemeRoot renders the html attributes and children", () => {
  const html = renderToString(
    ThemeRoot({
      theme: theme({
        name: "fixture-local",
        settings: {
          values: {},
          attributes: { "data-rb-setting-density": "compact" },
          style: "",
        },
      }),
      lang: "en",
      children: "body",
    }),
  );

  assert.match(html, /^<html lang="en"/);
  assert.match(html, /data-rb-theme="fixture-local"/);
  assert.match(html, /data-rb-setting-density="compact"/);
  assert.match(html, /data-rb-layout="article"/);
  assert.doesNotMatch(html, /data-rb-mode=/);
  assert.match(html, /body/);
});

test("ThemeRoot and RiebeckiteHead resolve each request from Site context", () => {
  const renderSite = (
    title: string,
    language: string,
    headTags: readonly PluginHeadTag[],
  ): string =>
    renderToString(
      createElement(
        SiteProvider,
        {
          config: resolveConfig({ site: { title, locale: "en" } }),
          manifest,
          view: createPublicContentView(manifest),
          path: "/",
          language,
          headTags,
        },
        createElement(
          ThemeRoot,
          null,
          createElement(
            "head",
            null,
            createElement(RiebeckiteHead, { prod: false }),
          ),
          "body",
        ),
      ),
    );

  const first = renderSite("First site", "ja", [
    { tag: "meta", attrs: { name: "site", content: "first" } },
  ]);
  const second = renderSite("Second site", "en", [
    { tag: "meta", attrs: { name: "site", content: "second" } },
  ]);

  assert.match(first, /^<html lang="ja"/);
  assert.match(first, /<title>First site<\/title>/);
  assert.match(first, /content="first"/);
  assert.doesNotMatch(first, /Second site|content="second"/);
  assert.match(second, /^<html lang="en"/);
  assert.match(second, /<title>Second site<\/title>/);
  assert.match(second, /content="second"/);
  assert.doesNotMatch(second, /First site|content="first"/);
});

test("a Site can compose extra head elements next to RiebeckiteHead", () => {
  const html = renderToString(
    createElement(
      "head",
      null,
      RiebeckiteHead({
        title: "Site Title",
        prod: false,
        colorModeScript: false,
      }),
      createElement("meta", { name: "custom-site-value", content: "yes" }),
    ),
  );

  assert.match(html, /<meta name="custom-site-value" content="yes"/);
  assertInOrder(html, ["<title>Site Title</title>", "custom-site-value"]);
});
