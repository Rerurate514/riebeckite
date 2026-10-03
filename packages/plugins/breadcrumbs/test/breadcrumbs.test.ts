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

test("dedupes the home crumb when it matches the current README title", () => {
  const entry = makeEntry({ slug: "README", title: "README" });
  const items = buildBreadcrumbItems({
    manifest: makeManifest([entry]),
    entry,
    config,
    homeLabel: "README",
  });

  assert.deepEqual(items, [{ name: "README", url: "/README" }]);
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

test("builds text-only crumbs for folders with no public location", () => {
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
    { name: "Docs" },
    { name: "Guide" },
    { name: "Intro", url: "/n/docs/guide/intro" },
  ]);
});

test("uses a README owner's title and public location for its crumb", () => {
  const folder = makeEntry({
    slug: "docs/README",
    title: "Documentation",
    permalink: "/manual/",
  });
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
  assert.equal(items[1]?.url, "/manual/");
});

test("omits a leading localized source folder hidden from the permalink", () => {
  const entry = makeEntry({
    slug: "ja/docs/getting-started/quick-start",
    title: "quick-start",
    permalink: "/docs/getting-started/quick-start",
  });
  const items = buildBreadcrumbItems({
    manifest: makeManifest([entry]),
    entry,
    config,
    homeLabel: "",
  });

  assert.deepEqual(
    items.map((item) => item.name),
    ["My Site", "Docs", "Getting-started", "quick-start"],
  );
});

test("uses registered generated folder locations without synthesizing URLs", () => {
  const entry = makeEntry({
    slug: "docs/guide/intro",
    title: "Intro",
    permalink: "/manual/intro",
  });
  const manifest = makeManifest([entry]);
  manifest.folderLocations.set("docs", { pathname: "/handbook/" });

  const items = buildBreadcrumbItems({
    manifest,
    entry,
    config,
    homeLabel: "",
  });

  assert.deepEqual(items, [
    { name: "My Site", url: "/" },
    { name: "Docs", url: "/handbook/" },
    { name: "Guide" },
    { name: "Intro", url: "/manual/intro" },
  ]);
});

test("does not expose draft folder owner titles or locations", () => {
  const draftOwner = makeEntry({
    slug: "docs/README",
    title: "Private documentation",
    permalink: "/private-docs/",
    publishing: { visibility: "draft", routable: false, discoverable: false },
  });
  const entry = makeEntry({ slug: "docs/page", title: "Page" });
  const items = buildBreadcrumbItems({
    manifest: makeManifest([draftOwner, entry]),
    entry,
    config,
    homeLabel: "",
  });

  assert.deepEqual(items[1], { name: "Docs" });
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
    ["/", undefined, "/n/docs/intro"],
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
