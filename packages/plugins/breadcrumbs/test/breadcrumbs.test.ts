import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ContentManifest,
  type ContentManifestEntry,
  type ResolvedRiebeckiteConfig,
  resolveConfig,
} from "@riebeckite/core";
import {
  breadcrumbs,
  buildBreadcrumbItems,
  resolveBreadcrumbsOptions,
} from "../index.ts";

function makeEntry(
  overrides: Partial<ContentManifestEntry> & { slug: string },
): ContentManifestEntry {
  const permalink = overrides.slug === "index" ? "/" : `/${overrides.slug}`;

  return {
    slug: overrides.slug,
    permalink,
    publicLocation: { slug: overrides.slug, permalink },
    title: "",
    frontmatter: {},
    html: "",
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
    ...overrides,
  };
}

function makeManifest(entries: ContentManifestEntry[]): ContentManifest {
  return {
    entries,
    publicEntries: entries,
    bySlug: new Map(entries.map((entry) => [entry.slug, entry])),
  } as unknown as ContentManifest;
}

const config = resolveConfig({
  site: { title: "My Site", baseUrl: "https://example.com" },
});

test("prepends the site title as the home crumb", () => {
  const entry = makeEntry({ slug: "about", title: "About" });
  const items = buildBreadcrumbItems({
    manifest: makeManifest([entry]),
    entry,
    config,
    homeLabel: "",
  });

  assert.deepEqual(items, [
    { name: "My Site", url: "/" },
    { name: "About", url: "/about" },
  ]);
});

test("homeLabel overrides the site title", () => {
  const entry = makeEntry({ slug: "about", title: "About" });
  const items = buildBreadcrumbItems({
    manifest: makeManifest([entry]),
    entry,
    config,
    homeLabel: "Home",
  });

  assert.equal(items[0]?.name, "Home");
});

test("omits the home crumb when no label is available", () => {
  const entry = makeEntry({ slug: "about", title: "About" });
  const untitled = {
    ...config,
    site: { ...config.site, title: "" },
  } as ResolvedRiebeckiteConfig;
  const items = buildBreadcrumbItems({
    manifest: makeManifest([entry]),
    entry,
    config: untitled,
    homeLabel: "",
  });

  assert.deepEqual(items, [{ name: "About", url: "/about" }]);
});

test("builds a crumb per folder segment, title-casing unknown folders", () => {
  const entry = makeEntry({
    slug: "docs/guide/intro",
    title: "Intro",
    permalink: "/n/docs/guide/intro",
  });
  const items = buildBreadcrumbItems({
    manifest: makeManifest([entry]),
    entry,
    config,
    homeLabel: "",
  });

  assert.deepEqual(items, [
    { name: "My Site", url: "/" },
    { name: "Docs", url: "/docs" },
    { name: "Guide", url: "/docs/guide" },
    { name: "Intro", url: "/n/docs/guide/intro" },
  ]);
});

test("uses a folder index note's title for its crumb", () => {
  const folder = makeEntry({ slug: "docs", title: "Documentation" });
  const entry = makeEntry({
    slug: "docs/intro",
    title: "Intro",
    permalink: "/n/docs/intro",
  });
  const items = buildBreadcrumbItems({
    manifest: makeManifest([folder, entry]),
    entry,
    config,
    homeLabel: "",
  });

  assert.equal(items[1]?.name, "Documentation");
  assert.equal(items[1]?.url, "/docs");
});

test("returns an empty trail for an empty slug and ignores stray slashes", () => {
  const empty = makeEntry({ slug: "" });
  assert.deepEqual(
    buildBreadcrumbItems({
      manifest: makeManifest([empty]),
      entry: empty,
      config,
      homeLabel: "",
    }),
    [],
  );

  const slashed = makeEntry({
    slug: "/docs/intro/",
    title: "Intro",
    permalink: "/n/docs/intro",
  });
  const items = buildBreadcrumbItems({
    manifest: makeManifest([slashed]),
    entry: slashed,
    config,
    homeLabel: "",
  });
  assert.deepEqual(
    items.map((item) => item.url),
    ["/", "/docs", "/n/docs/intro"],
  );
});

test("titleCaseSegment only uppercases the first character", () => {
  const entry = makeEntry({
    slug: "myDocs/API/leaf",
    title: "Leaf",
    permalink: "/n/leaf",
  });
  const items = buildBreadcrumbItems({
    manifest: makeManifest([entry]),
    entry,
    config,
    homeLabel: "",
  });

  assert.equal(items[1]?.name, "MyDocs");
  assert.equal(items[2]?.name, "API");
  assert.equal(items[3]?.name, "Leaf");
});

test("resolveBreadcrumbsOptions applies defaults and trims strings", () => {
  assert.deepEqual(resolveBreadcrumbsOptions(undefined), {
    homeLabel: "",
    className: "rb-breadcrumbs",
    ariaLabel: "Breadcrumbs",
    separator: "/",
    jsonLd: true,
  });

  assert.deepEqual(
    resolveBreadcrumbsOptions({
      homeLabel: "  Home  ",
      className: "  crumbs  ",
      ariaLabel: "  You are here  ",
      separator: "›",
      jsonLd: false,
    }),
    {
      homeLabel: "Home",
      className: "crumbs",
      ariaLabel: "You are here",
      separator: "›",
      jsonLd: false,
    },
  );

  const blank = resolveBreadcrumbsOptions({
    homeLabel: "   ",
    className: "   ",
    ariaLabel: "",
    separator: "",
  });
  assert.equal(blank.homeLabel, "");
  assert.equal(blank.className, "rb-breadcrumbs");
  assert.equal(blank.ariaLabel, "Breadcrumbs");
  assert.equal(blank.separator, "");
});

test("validateOptions reports invalid option values", () => {
  const plugin = breadcrumbs();

  assert.deepEqual(plugin.validateOptions?.(undefined), []);
  assert.deepEqual(
    plugin.validateOptions?.({
      homeLabel: "  ",
      className: "ok",
      separator: "/",
      jsonLd: true,
    }),
    [{ path: "homeLabel", message: "Expected a non-empty string." }],
  );

  const issues = plugin.validateOptions?.({
    className: 5,
    jsonLd: "yes",
  } as never);
  assert.deepEqual(issues, [
    { path: "className", message: "Expected a non-empty string." },
    { path: "jsonLd", message: "Expected a boolean." },
  ]);
});
