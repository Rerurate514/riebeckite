import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ContentManifest,
  ContentManifestEntry,
  Diagnostic,
} from "@riebeckite/core";
import { createPublicContentView } from "@riebeckite/core";
import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import Properties from "../components/properties.js";
import { properties, propertiesPlugin } from "../index.ts";
import { getProperties } from "../src/component-data.js";

(globalThis as { React?: unknown }).React = { createElement, Fragment };

function entry(
  slug: string,
  frontmatter: Record<string, unknown> = {},
  html = "",
): ContentManifestEntry {
  const permalink = `/${slug}`;
  return {
    slug,
    permalink,
    publicLocation: { slug, permalink },
    title: slug,
    frontmatter,
    html,
    publishing: { visibility: "public", routable: true, discoverable: true },
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
  };
}

function manifestOf(entries: ContentManifestEntry[]): ContentManifest {
  return {
    entries,
    publicEntries: entries,
    bySlug: new Map(entries.map((item) => [item.slug, item])),
    contentIndex: new Map(),
  } as unknown as ContentManifest;
}

async function runHook(
  plugin: ReturnType<typeof properties>,
  entries: ContentManifestEntry[],
): Promise<Diagnostic[]> {
  const manifest = manifestOf(entries);
  const diagnostics: Diagnostic[] = [];
  await plugin.onManifestCreated?.({ manifest, diagnostics } as never);
  return diagnostics;
}

test("properties() is re-exported as propertiesPlugin and registers its stylesheet", () => {
  assert.equal(propertiesPlugin, properties);
  assert.deepEqual(properties().assets, [
    {
      pluginName: "properties",
      kind: "style",
      moduleSpecifier: "@riebeckite/plugin-properties/style.css",
    },
  ]);
});

test("renders the properties panel data for the Site", async () => {
  const entries = [entry("a", { title: "A" }, "<p>A</p>")];
  const manifest = manifestOf(entries);
  const view = createPublicContentView(manifest);
  const entry_ = manifest.entries[0];
  const data = await getProperties({ view, frontmatter: entry_.frontmatter });

  assert.equal(
    renderToString(await Properties({ data })).includes("data-properties"),
    true,
  );
  assert.match(
    renderToString(await Properties({ data })),
    /data-property-count="1"/,
  );
  await runHook(properties(), entries);
});

test("renders nothing when options produce no items", async () => {
  const entries = [entry("a", { publish: true }, "<p>A</p>")];
  const diagnostics = await runHook(properties(), entries);
  assert.deepEqual(diagnostics, []);
  const data = await getProperties({
    view: createPublicContentView(manifestOf(entries)),
    frontmatter: entries[0].frontmatter,
  });
  assert.equal(renderToString(await Properties({ data })), "");
});

test("the manifest hook is idempotent and skips empty panels", async () => {
  const already = entry("done", { title: "A" }, "<p>A</p>");
  const nothing = entry("nothing", { publish: true }, "<p>B</p>");
  const empty = entry("empty", { publish: true }, "");

  await runHook(properties(), [already, nothing, empty]);

  assert.equal(already.html, "<p>A</p>");
  const emptyData = await getProperties({
    view: createPublicContentView(manifestOf([empty])),
    frontmatter: empty.frontmatter,
  });
  assert.equal(renderToString(await Properties({ data: emptyData })), "");
  assert.equal(nothing.html, "<p>B</p>");
  assert.equal(empty.html, "");
});

test("wikilink values resolve through the manifest content index", async () => {
  const source = entry("note", { title: "Note" }, "<p>n</p>");
  const linking = entry(
    "a",
    { title: "A", related: "[[note#Section]]" },
    "<p>A</p>",
  );
  const manifest = manifestOf([source, linking]);
  manifest.contentIndex.set("note", "note");

  const diagnostics: Diagnostic[] = [];
  await properties().onManifestCreated?.({ manifest, diagnostics } as never);

  const data = await getProperties({
    view: createPublicContentView(manifest),
    frontmatter: linking.frontmatter,
  });
  const html = renderToString(await Properties({ data }));
  assert.match(html, /href="\/note#Section"/);
  assert.doesNotMatch(html, /\[\[note/);
  assert.deepEqual(diagnostics, []);
});

test("unrenderable values produce a tagged diagnostic", async () => {
  const entries = [entry("bad", { weird: Symbol("x") }, "<p>b</p>")];
  const diagnostics = await runHook(properties(), entries);

  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]?.code, "properties-unrenderable-value");
  assert.equal(diagnostics[0]?.severity, "warning");
  assert.equal(diagnostics[0]?.pluginName, "properties");
  assert.equal(diagnostics[0]?.slug, "bad");
  assert.match(diagnostics[0]?.message ?? "", /`weird`/);
});
