import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ContentLink,
  type ContentManifestEntry,
  createDerivedViewRegistry,
  type PlannedGeneratedOutput,
  type PluginGeneratedOutputPlanContext,
} from "@riebeckite/core";
import { dataset } from "../index.ts";

type EntryOptions = {
  permalink?: string;
  title?: string;
  frontmatter?: Record<string, unknown>;
  links?: ContentLink[];
  tags?: string[];
};

function entry(slug: string, options: EntryOptions = {}): ContentManifestEntry {
  const permalink = options.permalink ?? `/${slug}`;
  return {
    slug,
    permalink,
    publicLocation: { slug, permalink },
    title: options.title ?? slug,
    frontmatter: options.frontmatter ?? {},
    publishing: { visibility: "public", routable: true, discoverable: true },
    html: "",
    tags: options.tags ?? [],
    links: options.links ?? [],
    backlinks: [],
    assets: [],
  };
}

function noteLink(raw: string, slug: string): ContentLink {
  return { raw, slug, kind: "note", embed: false };
}

async function collectOutputs(
  plugin: ReturnType<typeof dataset>,
  discoverable: readonly ContentManifestEntry[],
  routable: readonly ContentManifestEntry[] = discoverable,
): Promise<readonly PlannedGeneratedOutput[]> {
  const context: PluginGeneratedOutputPlanContext = {
    manifest: {
      discoverableEntries: discoverable,
      routableEntries: routable,
    },
    site: undefined,
    derived: createDerivedViewRegistry(),
  };
  return (await plugin.planGeneratedOutputs?.(context)) ?? [];
}

function text(candidate: PlannedGeneratedOutput): string {
  assert.equal(typeof candidate.content, "string");
  return candidate.content as string;
}

function output(
  outputs: readonly PlannedGeneratedOutput[],
  path: string,
): PlannedGeneratedOutput {
  const found = outputs.find((candidate) => candidate.path === path);
  assert.ok(found, `missing output ${path}`);
  return found;
}

function records(content: string): unknown[] {
  return content
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => JSON.parse(line));
}

test("dataset writes sorted pages, links, and index under the default directory", async () => {
  const a = entry("a", {
    title: "Note A",
    tags: ["x"],
    frontmatter: { date: "2026-01-02" },
    links: [
      noteLink("[[b]]", "b"),
      { raw: "[[draft]]", slug: "draft", kind: "note", embed: false },
      { raw: "[[missing]]", slug: null, kind: "unresolved", embed: false },
      { raw: "![[image.png]]", slug: "image", kind: "image", embed: true },
      { raw: "![[b]]", slug: "b", kind: "note", embed: true },
    ],
  });
  const b = entry("b", { title: "Note B" });
  const draft = entry("draft", { permalink: "/private" });
  const outputs = await collectOutputs(dataset(), [b, a], [b, a, draft]);

  assert.deepEqual(
    outputs.map((candidate) => candidate.path),
    ["data/pages.ndjson", "data/links.ndjson", "data/index.json"],
  );

  assert.deepEqual(records(text(output(outputs, "data/pages.ndjson"))), [
    {
      slug: "a",
      permalink: "/a",
      title: "Note A",
      tags: ["x"],
      date: "2026-01-02T00:00:00.000Z",
    },
    { slug: "b", permalink: "/b", title: "Note B", tags: [], date: null },
  ]);

  assert.deepEqual(records(text(output(outputs, "data/links.ndjson"))), [
    {
      sourceSlug: "a",
      sourcePermalink: "/a",
      targetSlug: "b",
      targetPermalink: "/b",
      raw: "![[b]]",
      embed: true,
    },
    {
      sourceSlug: "a",
      sourcePermalink: "/a",
      targetSlug: "b",
      targetPermalink: "/b",
      raw: "[[b]]",
      embed: false,
    },
  ]);

  assert.deepEqual(JSON.parse(text(output(outputs, "data/index.json"))), {
    schemaVersion: 1,
    generator: "@riebeckite/plugin-dataset",
    pages: 2,
    links: 2,
  });

  for (const candidate of outputs) {
    const content = text(candidate);
    assert.ok(content || candidate.path.endsWith("links.ndjson"));
    assert.ok(!content.includes("/private"));
    assert.deepEqual(candidate.dependencies, [{ type: "global" }]);
  }
});

test("dataset drops non-discoverable targets from every output", async () => {
  const secret = entry("secret", { permalink: "/secret" });
  const a = entry("a", { links: [noteLink("[[secret]]", "secret")] });
  const outputs = await collectOutputs(dataset(), [a], [a, secret]);

  assert.equal(
    text(output(outputs, "data/pages.ndjson")),
    '{"slug":"a","permalink":"/a","title":"a","tags":[],"date":null}\n',
  );
  assert.equal(text(output(outputs, "data/links.ndjson")), "");
  assert.deepEqual(JSON.parse(text(output(outputs, "data/index.json"))), {
    schemaVersion: 1,
    generator: "@riebeckite/plugin-dataset",
    pages: 1,
    links: 0,
  });
  for (const candidate of outputs) {
    assert.ok(!text(candidate).includes("/secret"));
  }
});

test("dataset honors the directory option", async () => {
  const outputs = await collectOutputs(dataset({ directory: "exports/data" }), [
    entry("a"),
  ]);
  assert.deepEqual(
    outputs.map((candidate) => candidate.path),
    [
      "exports/data/pages.ndjson",
      "exports/data/links.ndjson",
      "exports/data/index.json",
    ],
  );
});

test("dataset validates the directory option", () => {
  const plugin = dataset();
  assert.deepEqual(plugin.validateOptions?.(undefined), []);
  assert.deepEqual(plugin.validateOptions?.({}), []);
  assert.deepEqual(plugin.validateOptions?.({ directory: "data/sub" }), []);
  assert.equal(plugin.validateOptions?.({ directory: "" })?.length, 1);
  assert.equal(plugin.validateOptions?.({ directory: "/data" })?.length, 1);
  assert.equal(plugin.validateOptions?.({ directory: "../up" })?.length, 1);
  assert.equal(plugin.validateOptions?.({ directory: "a//b" })?.length, 1);
});
