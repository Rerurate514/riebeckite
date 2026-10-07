import assert from "node:assert/strict";
import { test } from "node:test";

import type { PluginHeadTag, ResolvedRiebeckiteConfig } from "@riebeckite/core";
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

function theme(overrides: Partial<ResolvedTheme> = {}): ResolvedTheme {
  return {
    name: "riebeckite",
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
    tokens: {},
    attributes: {},
    userCss: [],
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

test("RiebeckiteHead renders the default favicon", () => {
  assert.match(renderHead(), /<link rel="icon" href="\/favicon.ico"/);
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

test("RiebeckiteHead renders the default stylesheet entry", () => {
  assert.match(renderHead(), /href="\/app\/style.css"/);
});

test("RiebeckiteHead renders custom stylesheet entries in order", () => {
  const html = renderHead({
    stylesheets: ["/app/theme.css", "/app/print.css"],
  });

  assertInOrder(html, ["/app/theme.css", "/app/print.css"]);
  assert.doesNotMatch(html, /\/app\/style\.css/);
});

test("RiebeckiteHead renders the default client entry", () => {
  assert.match(renderHead(), /src="\/app\/client.ts"/);
});

test("RiebeckiteHead omits the client entry when clientSrc is null", () => {
  assert.doesNotMatch(
    renderHead({ clientSrc: null }),
    /src="\/app\/client\.ts"/,
  );
});

test("RiebeckiteHead includes the color-mode bootstrap by default", () => {
  assert.match(renderHead(), /data-rb-color-mode/);
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
    /<script type="application\/ld\+json">\{"@type":"WebSite"\}<\/script>/,
  );
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
    "data-theme": undefined,
    "data-theme-name": "riebeckite",
    "data-typography": "system",
    "data-article-layout": "article",
  });
});

test("themeRootAttributes omits data-theme for the system color mode", () => {
  assert.equal(
    themeRootAttributes(theme({ colorMode: "system" }))["data-theme"],
    undefined,
  );
});

test("themeRootAttributes sets data-theme for explicit light and dark modes", () => {
  assert.equal(
    themeRootAttributes(theme({ colorMode: "light" }))["data-theme"],
    "light",
  );
  assert.equal(
    themeRootAttributes(theme({ colorMode: "dark" }))["data-theme"],
    "dark",
  );
});

test("themeRootAttributes passes through custom data attributes", () => {
  const attributes = themeRootAttributes(
    theme({ attributes: { "data-fixture-theme": "local" } }),
  );

  assert.equal(attributes["data-fixture-theme"], "local");
});

test("themeRootAttributes lets the reserved attributes win over custom ones", () => {
  const attributes = themeRootAttributes(
    theme({
      name: "custom",
      attributes: { "data-theme-name": "ignored" },
    }),
  );

  assert.equal(attributes["data-theme-name"], "custom");
});

test("themeRootAttributes derives the theme name, typography, and article layout", () => {
  const attributes = themeRootAttributes(
    theme({
      name: "minimal",
      typography: "serif",
      articleLayout: "sidebar",
    }),
  );

  assert.equal(attributes["data-theme-name"], "minimal");
  assert.equal(attributes["data-typography"], "serif");
  assert.equal(attributes["data-article-layout"], "sidebar");
});

test("ThemeRoot renders the html attributes and children", () => {
  const html = renderToString(
    ThemeRoot({
      theme: theme({
        name: "fixture-local",
        attributes: { "data-fixture-theme": "local" },
      }),
      lang: "en",
      children: "body",
    }),
  );

  assert.match(html, /^<html lang="en"/);
  assert.match(html, /data-theme-name="fixture-local"/);
  assert.match(html, /data-fixture-theme="local"/);
  assert.match(html, /data-typography="system"/);
  assert.match(html, /data-article-layout="article"/);
  assert.doesNotMatch(html, /data-theme=/);
  assert.match(html, /body/);
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
