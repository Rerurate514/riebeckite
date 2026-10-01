import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ContentManifest,
  type ContentManifestEntry,
  type PostFrontmatter,
  resolveConfig,
} from "@riebeckite/core";
import { buildSearchItems } from "../src/search-index.server.ts";

const explicit = resolveConfig({
  site: { title: "Test" },
  content: { filters: { publishStrategy: "explicit" } },
});

function entry(
  slug: string,
  frontmatter: PostFrontmatter,
  html: string,
  tags: string[] = [],
): ContentManifestEntry {
  const permalink = `/${slug}`;
  return {
    slug,
    permalink,
    publicLocation: { slug, permalink },
    title: slug,
    frontmatter,
    publishing:
      frontmatter.publish === false ||
      frontmatter.private === true ||
      frontmatter.draft === true
        ? { visibility: "draft", routable: false, discoverable: false }
        : { visibility: "public", routable: true, discoverable: true },
    html,
    tags,
    links: [],
    backlinks: [],
    assets: [],
  };
}

function manifestOf(entries: ContentManifestEntry[]): ContentManifest {
  const publicEntries = entries.filter((item) => item.publishing.routable);
  const discoverableEntries = entries.filter(
    (item) => item.publishing.discoverable,
  );
  return {
    entries,
    publicEntries,
    discoverableEntries,
    bySlug: new Map(entries.map((item) => [item.slug, item])),
    contentIndex: new Map(),
  } as unknown as ContentManifest;
}

test("buildSearchItems filters unpublished notes and extracts every field", () => {
  const items = buildSearchItems({
    config: explicit,
    manifest: manifestOf([
      entry(
        "notes/alpha",
        {
          publish: true,
          title: "Alpha",
          description: "Desc",
          date: "2024-01-02",
        },
        "<h1>Intro</h1><h2>Sub &amp; Title</h2><p>Hello <strong>world</strong></p>",
        ["x"],
      ),
      entry("beta", { publish: false, title: "Beta" }, "<p>B</p>"),
      entry(
        "gamma",
        {
          publish: true,
          title: "Gamma",
          date: new Date("2024-02-03T00:00:00.000Z"),
        },
        "<p>C</p>",
      ),
    ]),
  });

  assert.deepEqual(
    items.map((entry) => entry.slug),
    ["notes/alpha", "gamma"],
  );

  assert.deepEqual(items[0], {
    slug: "notes/alpha",
    permalink: "/notes/alpha",
    title: "Alpha",
    headings: ["Intro", "Sub & Title"],
    body: "Intro Sub & Title Hello world",
    excerpt: "Desc",
    tags: ["x"],
    date: "2024-01-02T00:00:00.000Z",
  });
  assert.equal(items[1]?.date, "2024-02-03T00:00:00.000Z");
  assert.equal(items[1]?.excerpt, "C");
});

test("buildSearchItems falls back to the slug and accepts a title resolver", () => {
  const manifest = manifestOf([
    entry("guides/setup", { publish: true }, "<p>Setup</p>"),
  ]);

  assert.equal(
    buildSearchItems({ config: explicit, manifest })[0]?.title,
    "setup",
  );

  const overridden = buildSearchItems({
    config: explicit,
    manifest,
    resolveTitle: (slug) => `[${slug}]`,
  });
  assert.equal(overridden[0]?.title, "[guides/setup]");
});

test("the selective strategy keeps notes without a publish flag", () => {
  const selective = resolveConfig({
    site: { title: "Test" },
    content: { filters: { publishStrategy: "selective" } },
  });
  const items = buildSearchItems({
    config: selective,
    manifest: manifestOf([
      entry("open", {}, "<p>Open</p>"),
      entry("private", { private: true }, "<p>Private</p>"),
      entry("draft", { draft: true }, "<p>Draft</p>"),
    ]),
  });

  assert.deepEqual(
    items.map((entry) => entry.slug),
    ["open"],
  );
});

test("dates prefer published over date over created and reject invalid input", () => {
  const items = buildSearchItems({
    config: explicit,
    manifest: manifestOf([
      entry(
        "published",
        {
          publish: true,
          published: "2024-03-01",
          date: "2024-02-01",
          created: "2024-01-01",
        },
        "<p>P</p>",
      ),
      entry("dated", { publish: true, date: "2024-02-01" }, "<p>D</p>"),
      entry("created", { publish: true, created: "2024-01-01" }, "<p>C</p>"),
      entry("invalid", { publish: true, date: "not-a-date" }, "<p>I</p>"),
      entry("blank", { publish: true, date: "   " }, "<p>B</p>"),
      entry("bad-date", { publish: true, date: new Date("nope") }, "<p>X</p>"),
    ]),
  });

  const bySlug = new Map(items.map((item) => [item.slug, item.date]));
  assert.equal(bySlug.get("published"), "2024-03-01T00:00:00.000Z");
  assert.equal(bySlug.get("dated"), "2024-02-01T00:00:00.000Z");
  assert.equal(bySlug.get("created"), "2024-01-01T00:00:00.000Z");
  assert.equal(bySlug.get("invalid"), null);
  assert.equal(bySlug.get("blank"), null);
  assert.equal(bySlug.get("bad-date"), null);
});

test("script and style tags are stripped and plain text is collapsed", () => {
  const items = buildSearchItems({
    config: explicit,
    manifest: manifestOf([
      entry(
        "text",
        { publish: true },
        "<script>evil()</script><style>.x{}</style><p>Show &amp; tell &nbsp;now</p>",
      ),
    ]),
  });

  assert.equal(items[0]?.body, "Show & tell now");
  assert.equal(items[0]?.excerpt, "Show & tell now");
});

test("the body is truncated to 4000 characters", () => {
  const items = buildSearchItems({
    config: explicit,
    manifest: manifestOf([
      entry("long", { publish: true }, `<p>${"a".repeat(5000)}</p>`),
    ]),
  });

  assert.equal(items[0]?.body.length, 4000);
  assert.equal(items[0]?.body, "a".repeat(4000));
});

test("excerpts use the description, fall back to text, and cap at 180", () => {
  const items = buildSearchItems({
    config: explicit,
    manifest: manifestOf([
      entry("blank", { publish: true, description: "   " }, "<p>Fallback</p>"),
      entry(
        "long",
        { publish: true, description: "D".repeat(200) },
        "<p>X</p>",
      ),
    ]),
  });

  assert.equal(items[0]?.excerpt, "Fallback");
  assert.equal(items[1]?.excerpt.length, 180);
  assert.equal(items[1]?.excerpt, "D".repeat(180));
});

test("only h1-h4 headings are extracted and nested markup is stripped", () => {
  const items = buildSearchItems({
    config: explicit,
    manifest: manifestOf([
      entry(
        "headings",
        { publish: true },
        [
          "<h1>One</h1>",
          "<h2></h2>",
          "<h3> <code>Three</code> </h3>",
          "<h4>Four &amp; More</h4>",
          "<h5>Five</h5>",
        ].join(""),
      ),
    ]),
  });

  assert.deepEqual(items[0]?.headings, ["One", "Three", "Four & More"]);
});
