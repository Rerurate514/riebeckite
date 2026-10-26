import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ContentManifest,
  ContentManifestEntry,
  Diagnostic,
} from "@riebeckite/core";
import { query, remarkQuery } from "../index.ts";
import { createQueryPlaceholder } from "../src/placeholder.ts";

function entry(
  slug: string,
  frontmatter: Record<string, unknown>,
  html: string,
): ContentManifestEntry {
  const permalink = `/${slug}`;
  return {
    slug,
    permalink,
    publicLocation: { slug, permalink },
    title: slug,
    frontmatter,
    publishing: { visibility: "public", routable: true, discoverable: true },
    html,
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
    discoverableEntries: entries,
    bySlug: new Map(entries.map((item) => [item.slug, item])),
    contentIndex: new Map(),
  } as unknown as ContentManifest;
}

test("query validates its options", () => {
  const validate = query().validateOptions;
  assert.ok(validate);

  assert.deepEqual(validate(undefined), []);
  assert.deepEqual(
    validate({
      className: "q",
      language: "query",
      defaultFormat: "list",
      defaultColumns: ["title"],
      defaultLimit: 0,
      emptyMessage: "none",
      excludeSelf: false,
    }),
    [],
  );

  const issues = validate({
    className: "",
    language: " ",
    defaultFormat: "grid",
    defaultColumns: "title",
    defaultLimit: -1,
    emptyMessage: 1,
    excludeSelf: "yes",
  } as never);

  assert.deepEqual(
    issues.map((issue) => issue.path),
    [
      "className",
      "language",
      "defaultFormat",
      "defaultColumns",
      "defaultLimit",
      "emptyMessage",
      "excludeSelf",
    ],
  );
});

test("extendMarkdownPipeline registers remarkQuery with the configured language", () => {
  const uses: Array<[unknown, unknown]> = [];
  const pipeline = {
    use(plugin: unknown, options: unknown) {
      uses.push([plugin, options]);
    },
  };

  query().extendMarkdownPipeline?.(pipeline as never, {} as never);
  query({ language: "sql" }).extendMarkdownPipeline?.(
    pipeline as never,
    {} as never,
  );

  assert.equal(uses.length, 2);
  assert.equal(uses[0]?.[0], remarkQuery);
  assert.deepEqual(uses[0]?.[1], { language: "query" });
  assert.deepEqual(uses[1]?.[1], { language: "sql" });
});

test("the plugin resolves placeholders at manifest time", async () => {
  const plugin = query();
  const one = entry(
    "one",
    {},
    `<p>one</p>${createQueryPlaceholder("limit: 1")}`,
  );

  const diagnostics: Diagnostic[] = [];
  await plugin.onManifestCreated?.({
    manifest: manifestOf([one]),
    diagnostics,
  } as never);

  assert.deepEqual(diagnostics, []);
  assert.match(one.html, /data-rr-query-result/);
});
