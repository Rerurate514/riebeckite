import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  html?: string;
  frontmatter?: Record<string, unknown>;
  links?: ContentLink[];
  tags?: string[];
  language?: string;
};

function entry(slug: string, options: EntryOptions = {}): ContentManifestEntry {
  const permalink = options.permalink ?? `/${slug}`;
  return {
    slug,
    permalink,
    publicLocation: {
      slug,
      permalink,
      ...(options.language ? { language: options.language } : {}),
    },
    title: options.title ?? slug,
    frontmatter: options.frontmatter ?? {},
    publishing: { visibility: "public", routable: true, discoverable: true },
    html: options.html ?? "",
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
    html: "<p>Body of note A.</p>",
    tags: ["x"],
    frontmatter: { date: "2026-01-02", description: " Note A summary. " },
    links: [
      noteLink("[[b]]", "b"),
      { raw: "[[draft]]", slug: "draft", kind: "note", embed: false },
      { raw: "[[missing]]", slug: null, kind: "unresolved", embed: false },
      { raw: "![[image.png]]", slug: "image", kind: "image", embed: true },
      { raw: "![[b]]", slug: "b", kind: "note", embed: true },
    ],
  });
  const b = entry("b", { title: "Note B", language: "ja" });
  const draft = entry("draft", { permalink: "/private" });
  const outputs = await collectOutputs(dataset(), [b, a], [b, a, draft]);

  assert.deepEqual(
    outputs.map((candidate) => candidate.path),
    ["data/pages.ndjson", "data/links.ndjson", "data/index.json"],
  );

  assert.deepEqual(
    records(text(output(outputs, "data/pages.ndjson"))).map(
      (record) => record as Record<string, unknown>,
    ),
    [
      {
        slug: "a",
        permalink: "/a",
        title: "Note A",
        tags: ["x"],
        date: "2026-01-02T00:00:00.000Z",
        excerpt: "Note A summary.",
        body: "Body of note A.",
      },
      {
        slug: "b",
        permalink: "/b",
        title: "Note B",
        tags: [],
        date: null,
        excerpt: "",
        body: "",
        language: "ja",
      },
    ],
  );

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
    '{"slug":"a","permalink":"/a","title":"a","tags":[],"date":null,"excerpt":"","body":""}\n',
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

test("dataset drops excluded slug paths from pages and both link ends", async () => {
  const a = entry("a", {
    links: [noteLink("[[private/secret]]", "private/secret")],
  });
  const secret = entry("private/secret");
  const outputs = await collectOutputs(
    dataset({ exclude: ["private"] }),
    [a, secret],
    [a, secret],
  );

  assert.deepEqual(
    records(text(output(outputs, "data/pages.ndjson"))).map(
      (record) => (record as { slug: string }).slug,
    ),
    ["a"],
  );
  assert.deepEqual(text(output(outputs, "data/links.ndjson")), "");
  assert.deepEqual(JSON.parse(text(output(outputs, "data/index.json"))), {
    schemaVersion: 1,
    generator: "@riebeckite/plugin-dataset",
    pages: 1,
    links: 0,
  });
  for (const candidate of outputs) {
    assert.ok(!text(candidate).includes("/private"));
  }
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
  assert.deepEqual(plugin.validateOptions?.({ exclude: [] }), []);
  assert.deepEqual(plugin.validateOptions?.({ exclude: ["private"] }), []);
  assert.equal(
    plugin.validateOptions?.({ exclude: ["private", ""] })?.length,
    1,
  );
});

type Schema = {
  readonly type?: string | readonly string[];
  readonly const?: unknown;
  readonly minimum?: number;
  readonly required?: readonly string[];
  readonly properties?: Record<string, Schema>;
  readonly items?: Schema;
  readonly additionalProperties?: boolean;
};

function schemaTypeMatches(value: unknown, type: string): boolean {
  switch (type) {
    case "object":
      return (
        typeof value === "object" && value !== null && !Array.isArray(value)
      );
    case "array":
      return Array.isArray(value);
    case "string":
      return typeof value === "string";
    case "boolean":
      return typeof value === "boolean";
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "null":
      return value === null;
    default:
      return false;
  }
}

function validateSchema(
  value: unknown,
  schema: Schema,
  path: string,
): string[] {
  const errors: string[] = [];
  const types =
    schema.type === undefined
      ? []
      : Array.isArray(schema.type)
        ? schema.type
        : [schema.type];
  if (
    types.length > 0 &&
    !types.some((type) => schemaTypeMatches(value, type))
  ) {
    return [`${path}: expected type ${types.join(" or ")}`];
  }
  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${path}: expected ${JSON.stringify(schema.const)}`);
  }
  if (
    typeof value === "number" &&
    schema.minimum !== undefined &&
    value < schema.minimum
  ) {
    errors.push(`${path}: expected at least ${schema.minimum}`);
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!(key in record)) {
        errors.push(`${path}: missing required key ${JSON.stringify(key)}`);
      }
    }
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      if (key in record) {
        errors.push(...validateSchema(record[key], child, `${path}.${key}`));
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(record)) {
        if (!(key in (schema.properties ?? {}))) {
          errors.push(`${path}: unexpected key ${JSON.stringify(key)}`);
        }
      }
    }
  }
  if (Array.isArray(value) && schema.items !== undefined) {
    value.forEach((item, index) => {
      errors.push(
        ...validateSchema(item, schema.items as Schema, `${path}[${index}]`),
      );
    });
  }
  return errors;
}

function loadSchema(name: string): Schema {
  return JSON.parse(
    readFileSync(
      new URL(`../schema/${name}.schema.json`, import.meta.url),
      "utf8",
    ),
  ) as Schema;
}

test("dataset outputs conform to the published schemas and index counts", async () => {
  const a = entry("a", {
    title: "Note A",
    html: "<p>Body of note A.</p>",
    tags: ["x"],
    frontmatter: { date: "2026-01-02" },
    links: [
      noteLink("[[b]]", "b"),
      { raw: "![[b]]", slug: "b", kind: "note", embed: true },
    ],
    language: "ja",
  });
  const b = entry("b", { html: "<h1>Heading</h1>" });
  const outputs = await collectOutputs(dataset(), [a, b], [a, b]);

  const pages = records(text(output(outputs, "data/pages.ndjson")));
  const links = records(text(output(outputs, "data/links.ndjson")));
  const index = JSON.parse(text(output(outputs, "data/index.json")));

  assert.deepEqual(
    pages.flatMap((record) =>
      validateSchema(record, loadSchema("pages"), "page"),
    ),
    [],
  );
  assert.deepEqual(
    links.flatMap((record) =>
      validateSchema(record, loadSchema("links"), "link"),
    ),
    [],
  );
  assert.deepEqual(validateSchema(index, loadSchema("index"), "index"), []);
  const counts = index as { pages: number; links: number };
  assert.equal(counts.pages, pages.length);
  assert.equal(counts.links, links.length);
});
