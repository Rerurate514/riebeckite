import assert from "node:assert/strict";
import { test } from "node:test";

import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";

import { SiteNav, type SiteNavProps } from "../components/site-nav.tsx";

(globalThis as { React?: unknown }).React = { createElement, Fragment };

function render(props: SiteNavProps): string {
  return renderToString(SiteNav(props));
}

const guide = { label: "Guide", href: "/guide" } as const;

test("SiteNav renders an empty navigation", () => {
  const html = render({ items: [], path: "/" });
  assert.match(html, /^<nav class="rb-nav" aria-label="Site navigation">/);
  assert.match(html, /<ul class="rb-nav__list"><\/ul>/);
  assert.doesNotMatch(html, /rb-nav__item/);
});

test("SiteNav renders a single item", () => {
  const html = render({ items: [guide], path: "/" });
  assert.match(html, /<li class="rb-nav__item">/);
  assert.match(html, /<a href="\/guide" class="rb-nav__link">Guide<\/a>/);
});

test("SiteNav renders multiple items in order", () => {
  const html = render({
    items: [guide, { label: "Examples", href: "/examples" }],
    path: "/",
  });
  assert.ok(html.indexOf("Guide") < html.indexOf("Examples"));
});

test("SiteNav renders nested children with the child list class", () => {
  const html = render({
    items: [
      { ...guide, children: [{ label: "Planning", href: "/guide/planning" }] },
    ],
    path: "/",
  });
  assert.match(html, /<ul class="rb-nav__list rb-nav__children">/);
  assert.match(
    html,
    /<a href="\/guide\/planning" class="rb-nav__link">Planning<\/a>/,
  );
});

test("SiteNav renders deeply nested children", () => {
  const html = render({
    items: [
      {
        ...guide,
        children: [
          {
            label: "Planning",
            href: "/guide/planning",
            children: [{ label: "Roadmap", href: "/guide/planning/roadmap" }],
          },
        ],
      },
    ],
    path: "/",
  });
  assert.match(html, /href="\/guide\/planning\/roadmap"/);
  const childLists = html.match(/rb-nav__children/g) ?? [];
  assert.equal(childLists.length, 2);
});

test("SiteNav renders a label without an href as a span", () => {
  const html = render({ items: [{ label: "Group" }], path: "/" });
  assert.match(html, /<span class="rb-nav__label">Group<\/span>/);
  assert.doesNotMatch(html, /<a /);
});

test("SiteNav marks an exact path active", () => {
  const html = render({ items: [guide], path: "/guide" });
  assert.match(html, /class="rb-nav__link rb-nav__link--active"/);
  assert.match(html, /aria-current="page"/);
});

test("SiteNav marks a nested path active", () => {
  const html = render({ items: [guide], path: "/guide/setup" });
  assert.match(html, /rb-nav__link--active/);
  assert.match(html, /aria-current="page"/);
});

test("SiteNav does not mark a sibling prefix active", () => {
  const html = render({ items: [guide], path: "/guidance" });
  assert.doesNotMatch(html, /rb-nav__link--active/);
  assert.match(html, /class="rb-nav__link">Guide<\/a>/);
});

test("SiteNav marks the root item only at the root path", () => {
  const root = { label: "Home", href: "/" };
  assert.match(
    render({ items: [root], path: "/" }),
    /rb-nav__link--active[^>]*>Home/,
  );
  assert.doesNotMatch(
    render({ items: [root], path: "/guide" }),
    /rb-nav__link--active/,
  );
});

test("SiteNav normalizes trailing slashes", () => {
  assert.match(
    render({ items: [{ label: "Guide", href: "/guide/" }], path: "/guide" }),
    /rb-nav__link--active/,
  );
  assert.match(
    render({ items: [guide], path: "/guide/" }),
    /rb-nav__link--active/,
  );
});

test("SiteNav matches unlocalized hrefs against a locale-prefixed path", () => {
  for (const language of ["ja", "en"]) {
    const html = render({
      items: [guide],
      path: `/${language}/guide`,
      language,
    });
    assert.match(html, /rb-nav__link--active/, `language ${language}`);
  }
});

test("SiteNav treats a bare language path as the root", () => {
  const html = render({
    items: [{ label: "Home", href: "/" }],
    path: "/en",
    language: "en",
  });
  assert.match(html, /rb-nav__link--active/);
});

test("SiteNav ignores a locale prefix that does not match the language", () => {
  const html = render({ items: [guide], path: "/fr/guide", language: "en" });
  assert.doesNotMatch(html, /rb-nav__link--active/);
});

test("SiteNav keeps authored hrefs unlocalized when no localizeHref is set", () => {
  const html = render({ items: [guide], path: "/ja/guide", language: "ja" });
  assert.match(html, /href="\/guide"/);
});

test("SiteNav applies localizeHref to the rendered href but not to active detection", () => {
  const html = render({
    items: [guide],
    path: "/ja/guide",
    language: "ja",
    localizeHref: (href) => `/ja${href}`,
  });
  assert.match(html, /href="\/ja\/guide"/);
  assert.match(html, /rb-nav__link--active/);
});

test("SiteNav renders external links with target and rel and never marks them active", () => {
  const html = render({
    items: [{ label: "GitHub", href: "https://github.com/x", external: true }],
    path: "/github",
  });
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noreferrer"/);
  assert.doesNotMatch(html, /rb-nav__link--active/);
  assert.doesNotMatch(html, /aria-current/);
});

test("SiteNav renders internal links without external attributes", () => {
  const html = render({ items: [guide], path: "/" });
  assert.doesNotMatch(html, /target=/);
  assert.doesNotMatch(html, /rel=/);
});

test("SiteNav supports the label escape hatch", () => {
  const html = render({
    items: [guide],
    path: "/",
    label: "Footer navigation",
  });
  assert.match(html, /aria-label="Footer navigation"/);
});

test("SiteNav supports the class escape hatch", () => {
  const html = render({
    items: [guide],
    path: "/",
    class: "my-nav",
    className: "extra",
  });
  assert.match(html, /^<nav class="rb-nav my-nav extra"/);
});
