import assert from "node:assert/strict";
import { test } from "node:test";
import type { ContentManifest, ContentManifestEntry } from "@riebeckite/core";
import {
  buildNavigation,
  navigation,
  resolveSiteNavigation,
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

function makeManifest(
  entries: ContentManifestEntry[],
  discoverable: ContentManifestEntry[] = entries,
): ContentManifest {
  return {
    entries,
    publicEntries: discoverable,
    discoverableEntries: discoverable,
    bySlug: new Map(entries.map((entry) => [entry.slug, entry])),
    folderLocations: new Map(),
  } as unknown as ContentManifest;
}

test("derives sections from the slug hierarchy", () => {
  const guide = makeEntry({
    slug: "guide",
    title: "Guide",
    permalink: "/guide/",
  });
  const intro = makeEntry({ slug: "guide/intro", title: "Intro" });
  const notes = makeEntry({
    slug: "notes/README",
    title: "Notes",
    permalink: "/notes/",
  });
  const planning = makeEntry({ slug: "notes/planning", title: "Planning" });
  const about = makeEntry({ slug: "about", title: "About" });

  const model = buildNavigation([guide, intro, notes, planning, about]);

  assert.deepEqual(model.secondary, []);
  assert.deepEqual(model.primary, [
    { label: "About", href: "/about" },
    {
      label: "Guide",
      href: "/guide/",
      children: [{ label: "Intro", href: "/guide/intro" }],
    },
    {
      label: "Notes",
      href: "/notes/",
      children: [{ label: "Planning", href: "/notes/planning" }],
    },
  ]);
});

test("renders a folder without an index as a label with no href", () => {
  const alpha = makeEntry({ slug: "projects/alpha", title: "Alpha" });
  const beta = makeEntry({ slug: "projects/beta", title: "Beta" });

  const model = buildNavigation([alpha, beta]);

  assert.deepEqual(model.primary, [
    {
      label: "Projects",
      children: [
        { label: "Alpha", href: "/projects/alpha" },
        { label: "Beta", href: "/projects/beta" },
      ],
    },
  ]);
});

test("falls back to a title-cased slug segment", () => {
  const entry = makeEntry({ slug: "getting-started", title: "" });

  assert.deepEqual(buildNavigation([entry]).primary, [
    { label: "Getting Started", href: "/getting-started" },
  ]);
});

test("authored items replace derivation and secondary is returned", () => {
  const entry = makeEntry({ slug: "about", title: "About" });

  const model = buildNavigation([entry], {
    items: [{ label: "Home", href: "/" }],
    secondary: [
      { label: "GitHub", href: "https://example.com", external: true },
    ],
  });

  assert.deepEqual(model.primary, [{ label: "Home", href: "/" }]);
  assert.deepEqual(model.secondary, [
    { label: "GitHub", href: "https://example.com", external: true },
  ]);
});

test("resolveSiteNavigation returns null without the plugin", () => {
  const manifest = makeManifest([makeEntry({ slug: "about", title: "About" })]);

  assert.equal(resolveSiteNavigation({ plugins: [] }, manifest), null);
  assert.equal(resolveSiteNavigation({}, manifest), null);
  assert.equal(
    resolveSiteNavigation(
      { plugins: [{ name: "navigation", enabled: false }] },
      manifest,
    ),
    null,
  );
});

test("resolveSiteNavigation reads only discoverable entries", () => {
  const published = makeEntry({ slug: "published", title: "Published" });
  const draft = makeEntry({
    slug: "draft",
    title: "Draft",
    publishing: { visibility: "draft", routable: false, discoverable: false },
  });
  const manifest = makeManifest([published, draft], [published]);

  const model = resolveSiteNavigation(
    { plugins: [{ name: "navigation", options: {} }] },
    manifest,
  );

  assert.deepEqual(model?.primary, [
    { label: "Published", href: "/published" },
  ]);
});

test("validateOptions reports invalid authored items", () => {
  const plugin = navigation();

  assert.deepEqual(plugin.validateOptions?.(undefined), []);
  assert.deepEqual(plugin.validateOptions?.({ items: "nope" } as never), [
    { path: "items", message: "Expected an array." },
  ]);

  const issues = plugin.validateOptions?.({
    items: [{ label: "", href: "", external: "yes" }],
  } as never);
  assert.deepEqual(issues, [
    { path: "items[0].label", message: "Expected a non-empty string." },
    { path: "items[0].href", message: "Expected a non-empty string." },
    { path: "items[0].external", message: "Expected a boolean." },
  ]);
});

test("validateOptions requires href on authored groups and rejects recursion", () => {
  const plugin = navigation();
  const recursive: Record<string, unknown> = { label: "Recursive", href: "/x" };
  recursive.children = [recursive];

  assert.deepEqual(
    plugin.validateOptions?.({
      secondary: [{ label: "Group", children: [] }],
    } as never),
    [{ path: "secondary[0].href", message: "Expected a non-empty string." }],
  );
  assert.deepEqual(plugin.validateOptions?.({ items: [recursive] } as never), [
    {
      path: "items[0].children[0]",
      message: "Navigation children must not be recursive.",
    },
  ]);
});
