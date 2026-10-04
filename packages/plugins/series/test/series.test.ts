import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ContentManifest,
  ContentManifestEntry,
  PostFrontmatter,
} from "@riebeckite/core";
import { assertGolden } from "@riebeckite/test";
import {
  buildSeriesIndex,
  collectSeriesIndexes,
  DEFAULT_CLASS_NAME,
  renderSeriesIndex,
  renderSeriesNavigation,
  resolveSeriesOptions,
} from "../index.ts";
import { collectSeriesDiagnostics } from "../src/series.ts";

function entry(
  slug: string,
  frontmatter: PostFrontmatter = {},
  overrides: Partial<ContentManifestEntry> = {},
): ContentManifestEntry {
  const permalink = `/${slug}`;
  return {
    slug,
    permalink,
    publicLocation: { slug, permalink },
    title: slug,
    frontmatter,
    html: "",
    publishing: { visibility: "public", routable: true, discoverable: true },
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
    ...overrides,
  };
}

function manifestOf(entries: ContentManifestEntry[]): ContentManifest {
  return {
    entries,
    publicEntries: entries,
    bySlug: new Map(entries.map((item) => [item.slug, item])),
  } as unknown as ContentManifest;
}

const guide = manifestOf([
  entry("p2", { series: "Guide", series_order: 2 }, { title: "Second" }),
  entry("p1", { series: "Guide", series_order: 1 }, { title: "First" }),
  entry("other", { series: "Other", series_order: 1 }),
  entry("plain", {}),
]);

test("resolveSeriesOptions applies and overrides defaults", () => {
  assert.deepEqual(resolveSeriesOptions(), {
    key: "series",
    orderKey: "series_order",
    titleKey: "series_title",
    heading: true,
    className: "rb-series",
    positionLabel: false,
    basePath: "/series",
  });
  assert.equal(DEFAULT_CLASS_NAME, "rb-series");
  assert.deepEqual(resolveSeriesOptions({ heading: false, className: "sl" }), {
    key: "series",
    orderKey: "series_order",
    titleKey: "series_title",
    heading: false,
    className: "sl",
    positionLabel: false,
    basePath: "/series",
  });
  assert.deepEqual(resolveSeriesOptions({ basePath: "collections/" }), {
    key: "series",
    orderKey: "series_order",
    titleKey: "series_title",
    heading: true,
    className: "rb-series",
    positionLabel: false,
    basePath: "/collections",
  });
});

test("collectSeriesIndexes groups first-seen series and orders members by order", () => {
  const indexes = collectSeriesIndexes(guide);
  assert.deepEqual(
    indexes.map((index) => index.name),
    ["Guide", "Other"],
  );
  assert.deepEqual(
    indexes[0]?.members.map((member) => member.slug),
    ["p1", "p2"],
  );
  assert.equal(indexes[0]?.members[0]?.title, "First");
  assert.equal(indexes[0]?.members[0]?.series, "Guide");
  assert.equal(indexes[0]?.members[0]?.permalink, "/p1");
});

test("collectSeriesIndexes breaks order ties by date, title, then slug", () => {
  const index =
    collectSeriesIndexes(
      manifestOf([
        entry("a", { series: "S", title: "B", date: "2024-01-02" }),
        entry("b", { series: "S", title: "A", date: "2024-01-01" }),
        entry("c", { series: "S", title: "A", date: "2024-01-01" }),
        entry("d", { series: "S", series_order: 0 }),
        entry("e", { series: "S", series_order: 0, date: "2020-01-01" }),
      ]),
    )[0] ?? null;

  assert.deepEqual(
    index?.members.map((member) => member.slug),
    ["e", "d", "b", "c", "a"],
  );
  assert.equal(index?.members[0]?.order, 0);
  assert.equal(index?.members.at(-1)?.order, null);
});

test("collectSeriesIndexes honors custom keys and series_title", () => {
  const index = collectSeriesIndexes(
    manifestOf([
      entry("x", { part_of: "Series X", part: 2 }),
      entry("y", { part_of: "Series X", part: 1, part_title: "Display" }),
    ]),
    { key: "part_of", orderKey: "part", titleKey: "part_title" },
  )[0];

  assert.equal(index?.name, "Series X");
  assert.equal(index?.title, "Display");
  assert.deepEqual(
    index?.members.map((member) => member.slug),
    ["y", "x"],
  );
});

test("buildSeriesIndex finds a series by name or returns null", () => {
  assert.equal(buildSeriesIndex(guide, "Guide")?.members.length, 2);
  assert.equal(buildSeriesIndex(guide, "Missing"), null);
});

test("renderSeriesNavigation marks the current part and links prev/next", () => {
  const index = buildSeriesIndex(guide, "Guide");
  assert.ok(index);
  const html = renderSeriesNavigation(index, "p2", { positionLabel: true });

  assert.match(html, /data-series="Guide"/);
  assert.match(html, /aria-current="page">Second<\/a>/);
  assert.match(html, /class="rb-series__prev"[^>]*href="\/p1"/);
  assert.doesNotMatch(html, /rb-series__next/);
  assert.match(html, /Part 2 of 2/);

  assertGolden(
    renderSeriesNavigation(
      {
        name: "The Guide",
        title: "The Guide",
        members: [
          {
            slug: "p1",
            title: "Part One",
            permalink: "/posts/p1",
            order: 1,
            series: "The Guide",
          },
          {
            slug: "p2",
            title: "Part Two",
            permalink: "/posts/p2",
            order: 2,
            series: "The Guide",
          },
          {
            slug: "p3",
            title: "Part Three",
            permalink: "/posts/p3",
            order: 3,
            series: "The Guide",
          },
        ],
      },
      "p2",
      { positionLabel: true },
    ),
    new URL("./__golden__/series-navigation.html", import.meta.url),
  );
});

test("renderSeriesNavigation omits prev/next at the edges and for unknown slugs", () => {
  const index = buildSeriesIndex(guide, "Guide");
  assert.ok(index);

  const first = renderSeriesNavigation(index, "p1");
  assert.doesNotMatch(first, /rb-series__prev/);
  assert.match(first, /rb-series__next/);

  const last = renderSeriesNavigation(index, "p2");
  assert.match(last, /rb-series__prev/);
  assert.doesNotMatch(last, /rb-series__next/);

  const unknown = renderSeriesNavigation(index, "nope");
  assert.doesNotMatch(unknown, /aria-current/);
  assert.doesNotMatch(unknown, /rb-series__prev/);
  assert.doesNotMatch(unknown, /rb-series__next/);

  const noHeading = renderSeriesNavigation(index, "p1", { heading: false });
  assert.doesNotMatch(noHeading, /__title/);
});

test("renderSeriesNavigation escapes the series name and titles", () => {
  const html = renderSeriesNavigation(
    {
      name: 'A & "B"',
      title: "<T>",
      members: [
        {
          slug: "one",
          title: "<One>",
          permalink: "/one",
          order: 1,
          series: 'A & "B"',
        },
      ],
    },
    "one",
  );

  assert.match(html, /data-series="A &amp; &quot;B&quot;"/);
  assert.match(html, /rb-series__title/);
  assert.match(html, />&lt;T&gt;<\/a>/);
  assert.match(html, />&lt;One&gt;<\/a>/);
});

test("renderSeriesIndex renders a standalone section or an empty string", () => {
  assert.equal(renderSeriesIndex(guide, "Missing"), "");
  const html = renderSeriesIndex(guide, "Guide");
  assert.match(html, /class="rb-series rb-series--index" data-series="Guide"/);
  assert.match(html, /<h2 class="rb-series__title">Guide<\/h2>/);
  assert.equal((html.match(/data-series-order=/g) ?? []).length, 2);

  assertGolden(
    html,
    new URL("./__golden__/series-index.html", import.meta.url),
  );
});

test("collectSeriesDiagnostics reports invalid, missing, and duplicate orders", () => {
  const diagnostics = collectSeriesDiagnostics(
    manifestOf([
      entry("bad-name", { series: "   " }),
      entry("no-order", { series: "Guide" }),
      entry("d1", { series: "Guide", series_order: 1 }),
      entry("d2", { series: "Guide", series_order: 1 }),
      entry("ok", { series: "Guide", series_order: 2 }),
      entry("unrelated", {}),
    ]),
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["series-invalid-name", "series-missing-order", "series-duplicate-order"],
  );
  assert.equal(diagnostics[0]?.pluginName, "series");
  assert.equal(diagnostics[0]?.severity, "warning");
  assert.equal(diagnostics[1]?.slug, "no-order");
  assert.deepEqual(diagnostics[1]?.meta, { series: "Guide" });
  assert.match(diagnostics[2]?.message ?? "", /also in `d1`/);
});
