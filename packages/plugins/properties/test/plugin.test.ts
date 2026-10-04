import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ContentManifest,
  ContentManifestEntry,
  Diagnostic,
  PostFrontmatter,
} from "@riebeckite/core";
import { properties, propertiesPlugin } from "../index.ts";

function entry(
  slug: string,
  frontmatter: PostFrontmatter = {},
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

test("the manifest hook prepends the panel", async () => {
  const entries = [entry("a", { title: "A" }, "<p>A</p>")];

  const diagnostics = await runHook(properties(), entries);

  assert.equal(diagnostics.length, 0);
  assert.ok(entries[0]?.html.startsWith('<section class="rb-properties"'));
  assert.ok(entries[0]?.html.endsWith("<p>A</p>"));
  assert.match(entries[0]?.html ?? "", /data-properties/);
});

test("position end appends the panel", async () => {
  const entries = [entry("a", { title: "A" }, "<p>A</p>")];

  await runHook(properties({ position: "end" }), entries);

  assert.ok(entries[0]?.html.startsWith("<p>A</p><section"));
  assert.ok(entries[0]?.html.endsWith("</section>"));
});

test("render slot publishes the panel instead of mutating the note html", async () => {
  const entries = [entry("a", { title: "A" }, "<p>A</p>")];

  const plugin = properties({ render: "slot" });
  await runHook(plugin, entries);
  await runHook(plugin, entries);

  assert.equal(entries[0]?.html, "<p>A</p>");
  assert.ok(entries[0]?.bodySlots?.properties?.startsWith("<section"));
  assert.equal(
    entries[0]?.bodySlots?.properties?.match(/data-properties/g)?.length,
    1,
  );
});

test("render slot does not mistake a partial panel match for an existing panel", async () => {
  const entries = [entry("a", { title: "A" }, "<p>A</p>")];
  entries[0].bodySlots = { properties: '<section class="rb-properties">' };

  await runHook(properties({ render: "slot" }), entries);

  assert.equal(
    entries[0]?.bodySlots?.properties?.match(/data-properties/g)?.length,
    1,
  );
});

test("the manifest hook is idempotent and skips empty panels", async () => {
  const already = entry(
    "done",
    { title: "A" },
    "<section data-properties><p>A</p></section>",
  );
  const nothing = entry("nothing", { publish: true }, "<p>B</p>");
  const empty = entry("empty", { title: "C" }, "");

  await runHook(properties(), [already, nothing, empty]);

  assert.equal(already.html, "<section data-properties><p>A</p></section>");
  assert.equal(already.bodySlots, undefined);
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

  assert.match(linking.html, /href="\/note#Section"/);
  assert.doesNotMatch(linking.html, /\[\[note/);
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
