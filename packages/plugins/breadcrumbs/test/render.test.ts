import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ContentManifest,
  type ContentManifestEntry,
  type PluginManifestContext,
  resolveConfig,
} from "@riebeckite/core";
import { assertGolden } from "@riebeckite/test";
import {
  BREADCRUMBS_ATTRIBUTE,
  breadcrumbs,
  breadcrumbsPlugin,
  buildBreadcrumbHeadTag,
  buildBreadcrumbJsonLd,
  hasBreadcrumbHeadTag,
  renderBreadcrumbNav,
  resolveBreadcrumbsOptions,
} from "../index.ts";

function makeEntry(
  overrides: Omit<Partial<ContentManifestEntry>, "slug"> & { slug: string },
): ContentManifestEntry {
  const permalink =
    overrides.permalink ??
    (overrides.slug === "index" ? "/" : `/${overrides.slug}`);

  return {
    title: "",
    frontmatter: {},
    html: "",
    publishing: { visibility: "public", routable: true, discoverable: true },
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
    ...overrides,
    slug: overrides.slug,
    permalink,
    publicLocation: overrides.publicLocation ?? {
      slug: overrides.slug,
      permalink,
    },
  };
}

function makeManifest(entries: ContentManifestEntry[]): ContentManifest {
  return {
    entries,
    publicEntries: entries,
    discoverableEntries: entries,
    bySlug: new Map(entries.map((entry) => [entry.slug, entry])),
    folderLocations: new Map(),
  } as unknown as ContentManifest;
}

const config = resolveConfig({
  site: { title: "My Site", baseUrl: "https://example.com" },
});

test("renders an accessible ordered list with links and a current crumb", () => {
  const html = renderBreadcrumbNav(
    [
      { name: "Home", url: "/" },
      { name: "Intro", url: "/n/intro" },
    ],
    resolveBreadcrumbsOptions({}),
  );

  assert.equal(
    html,
    '<nav class="rb-breadcrumbs" data-breadcrumbs aria-label="Breadcrumbs">' +
      "<ol>" +
      '<li class="rb-breadcrumbs__item"><a class="rb-breadcrumbs__link" href="/">Home</a>' +
      '<span class="rb-breadcrumbs__separator" aria-hidden="true">/</span></li>' +
      '<li class="rb-breadcrumbs__item"><span class="rb-breadcrumbs__current" aria-current="page">Intro</span></li>' +
      "</ol></nav>",
  );
});

test("returns an empty string when there is nothing to render", () => {
  assert.equal(renderBreadcrumbNav([], resolveBreadcrumbsOptions({})), "");
});

test("renders an unresolved intermediate crumb as text", () => {
  const html = renderBreadcrumbNav(
    [
      { name: "Home", url: "/" },
      { name: "Docs" },
      { name: "Intro", url: "/docs/intro" },
    ],
    resolveBreadcrumbsOptions({}),
  );

  assert.match(html, /<span class="rb-breadcrumbs__text">Docs<\/span>/);
  assert.doesNotMatch(html, /href="\/docs"/);
});

test("escapes crumb names, urls and options", () => {
  const html = renderBreadcrumbNav(
    [
      { name: 'A <b> & "q"', url: "/a?x=<y>&z" },
      { name: "Done", url: "/done" },
    ],
    resolveBreadcrumbsOptions({
      className: 'c"x',
      ariaLabel: 'L"x',
      separator: "<",
    }),
  );

  assert.ok(html.includes('href="/a?x=&lt;y&gt;&amp;z"'));
  assert.ok(html.includes("A &lt;b&gt; &amp; &quot;q&quot;"));
  assert.ok(html.includes('aria-hidden="true">&lt;</span>'));
  assert.ok(html.includes('class="c&quot;x__link"'));
  assert.ok(!html.includes("<b>"));
  assert.ok(!html.includes('aria-label="L"x"'));
});

test("buildBreadcrumbJsonLd builds a positioned list with absolute urls", () => {
  const schema = buildBreadcrumbJsonLd(config, [
    { name: "Home", url: "/" },
    { name: "Intro", url: "/n/intro" },
  ]);

  assert.deepEqual(schema, {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://example.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Intro",
        item: "https://example.com/n/intro",
      },
    ],
  });
});

test("buildBreadcrumbJsonLd omits nonexistent item URLs", () => {
  const schema = buildBreadcrumbJsonLd(config, [
    { name: "Home", url: "/" },
    { name: "Docs" },
    { name: "Intro", url: "/docs/intro" },
  ]);
  const elements = schema.itemListElement as Array<Record<string, unknown>>;

  assert.equal(elements[1]?.item, undefined);
  assert.equal(elements[1]?.name, "Docs");
});

test("buildBreadcrumbJsonLd falls back to a default base url", () => {
  const noBase = resolveConfig({ site: { title: "My Site" } });
  const schema = buildBreadcrumbJsonLd(noBase, [{ name: "Home", url: "/" }]);
  const element = (
    schema.itemListElement as Array<{ item: string }> | undefined
  )?.[0];
  assert.equal(element?.item, "https://example.com/");
});

test("buildBreadcrumbHeadTag escapes the embedded JSON", () => {
  const schema = { "@type": "BreadcrumbList", name: "</script><b>&" };
  const tag = buildBreadcrumbHeadTag(schema);

  assert.equal(tag.tag, "script");
  assert.deepEqual(tag.attrs, { type: "application/ld+json" });
  assert.equal(tag.children?.includes("<"), false);
  assert.equal(tag.children?.includes("\\u003c"), true);
  assert.deepEqual(JSON.parse(tag.children ?? "{}"), schema);
});

test("hasBreadcrumbHeadTag detects an existing BreadcrumbList script", () => {
  assert.equal(hasBreadcrumbHeadTag(undefined), false);
  assert.equal(hasBreadcrumbHeadTag([]), false);
  assert.equal(
    hasBreadcrumbHeadTag([{ tag: "meta", attrs: { name: "x" } }]),
    false,
  );
  assert.equal(
    hasBreadcrumbHeadTag([{ tag: "script", children: "{}" }]),
    false,
  );
  assert.equal(
    hasBreadcrumbHeadTag([
      buildBreadcrumbHeadTag({ "@type": "BreadcrumbList" }),
    ]),
    true,
  );
  assert.equal(
    hasBreadcrumbHeadTag([
      {
        tag: "script",
        children: '{\n  "@graph": [{ "@type": "BreadcrumbList" }]\n}',
      },
    ]),
    true,
  );
});

test("golden: rendered breadcrumb navigation", () => {
  const html = renderBreadcrumbNav(
    [
      { name: "Home", url: "/" },
      { name: "Docs & Guides", url: "/docs" },
      { name: "API v2", url: "/docs/api" },
      { name: "GET /users", url: "/docs/api/users" },
    ],
    resolveBreadcrumbsOptions({
      className: "crumbs",
      ariaLabel: "You are here",
      separator: "›",
    }),
  );

  assertGolden(html, new URL("./__golden__/nav.html", import.meta.url));
});

test("onManifestCreated contributes the nav and a JSON-LD head tag", async () => {
  const plugin = breadcrumbs({ homeLabel: "Home" });
  const folder = makeEntry({
    slug: "docs/README",
    title: "Documentation",
    permalink: "/docs/",
  });
  const entry = makeEntry({
    slug: "docs/intro",
    title: "Intro",
    html: "<p>Body</p>",
    permalink: "/docs/intro",
  });
  const manifest = makeManifest([folder, entry]);
  const context = {
    manifest,
    config,
    diagnostics: [],
  } as unknown as PluginManifestContext;

  await plugin.onManifestCreated?.(context);

  assert.equal(entry.html, "<p>Body</p>");
  assert.ok(
    entry.bodySlots?.["article.header"]?.startsWith(
      '<nav class="rb-breadcrumbs"',
    ),
  );
  assert.equal(entry.headTags?.length, 1);

  const head = entry.headTags?.[0];
  assert.equal(head?.tag, "script");
  const schema = JSON.parse(
    head?.tag === "script" ? (head.children ?? "{}") : "{}",
  );
  assert.equal(schema["@type"], "BreadcrumbList");
  assert.deepEqual(
    (schema.itemListElement as Array<{ name: string }>).map(
      (item) => item.name,
    ),
    ["Home", "Documentation", "Intro"],
  );

  const contributed = entry.bodySlots?.["article.header"];
  await plugin.onManifestCreated?.(context);
  assert.equal(entry.bodySlots?.["article.header"], contributed);
  assert.equal(entry.headTags?.length, 1);
});

test("onManifestCreated can skip the JSON-LD script", async () => {
  const plugin = breadcrumbs({ jsonLd: false });
  const entry = makeEntry({
    slug: "docs/intro",
    title: "Intro",
    html: "<p>Body</p>",
    permalink: "/n/docs/intro",
  });
  const manifest = makeManifest([
    makeEntry({ slug: "docs/README", title: "Docs", permalink: "/docs/" }),
    entry,
  ]);
  const context = {
    manifest,
    config,
    diagnostics: [],
  } as unknown as PluginManifestContext;

  await plugin.onManifestCreated?.(context);

  assert.ok(
    entry.bodySlots?.["article.header"]?.includes(BREADCRUMBS_ATTRIBUTE),
  );
  assert.equal(entry.headTags, undefined);
});

test("onManifestCreated leaves an entry with no trail untouched", async () => {
  const plugin = breadcrumbs();
  const entry = makeEntry({ slug: "", html: "<p>Body</p>" });
  const manifest = makeManifest([entry]);
  const context = {
    manifest,
    config,
    diagnostics: [],
  } as unknown as PluginManifestContext;

  await plugin.onManifestCreated?.(context);

  assert.equal(entry.html, "<p>Body</p>");
  assert.equal(entry.headTags, undefined);
});

test("breadcrumbsPlugin is the same factory", () => {
  assert.equal(breadcrumbsPlugin, breadcrumbs);
});
