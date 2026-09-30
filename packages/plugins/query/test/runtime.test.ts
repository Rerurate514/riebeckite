import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ContentManifest,
  ContentManifestEntry,
  Diagnostic,
  PostContent,
} from "@riebeckite/core";
import { createQueryPlaceholder } from "../src/placeholder.ts";
import { createQueryRuntime } from "../src/runtime.ts";

function entry(
  slug: string,
  frontmatter: Record<string, unknown>,
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
    html,
    tags,
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

function track(entries: ContentManifestEntry[]): Map<string, PostContent> {
  return new Map(
    entries.map((item) => [
      item.slug,
      { frontmatter: item.frontmatter, html: item.html },
    ]),
  );
}

test("resolve replaces placeholders, selects entries, and syncs tracked content", () => {
  const source = "format: list\nlimit: 1";
  const one = entry("one", {}, `<p>one</p>${createQueryPlaceholder(source)}`, [
    "a",
  ]);
  const two = entry("two", {}, `<p>two</p>${createQueryPlaceholder(source)}`, [
    "b",
  ]);
  const manifest = manifestOf([one, two]);
  const tracked = track([one, two]);

  const runtime = createQueryRuntime({});
  for (const [slug, content] of tracked) runtime.track(slug, content);
  const diagnostics: Diagnostic[] = [];
  runtime.resolve(manifest, diagnostics);

  assert.equal(diagnostics.length, 0);
  assert.ok(one.html.startsWith('<p>one</p><div class="rr-query" '));
  assert.match(one.html, /data-rr-query-result/);
  assert.match(one.html, /<li class="rr-query__item">/);
  assert.match(one.html, /href="\/one"/);
  assert.equal(tracked.get("one")?.html, one.html);
  assert.equal(tracked.get("two")?.html, two.html);
});

test("excludeSelf removes the owning entry from the pool", () => {
  const source = "excludeSelf: true\nfilter:\n  tags:\n    any:\n      - a";
  const one = entry("one", {}, `<p>one</p>${createQueryPlaceholder(source)}`, [
    "a",
  ]);
  const two = entry("two", {}, `<p>two</p>${createQueryPlaceholder(source)}`, [
    "b",
  ]);
  const manifest = manifestOf([one, two]);

  createQueryRuntime({}).resolve(manifest, []);

  assert.match(one.html, /rr-query--empty/);
  assert.match(two.html, /data-rr-query-result/);
  assert.match(two.html, /href="\/one"/);
});

test("the plugin-level excludeSelf default applies when the spec omits it", () => {
  const source = "filter:\n  tags:\n    any:\n      - a";
  const one = entry("one", {}, createQueryPlaceholder(source), ["a"]);
  const two = entry("two", {}, createQueryPlaceholder(source), ["b"]);
  const manifest = manifestOf([one, two]);

  createQueryRuntime({ excludeSelf: true }).resolve(manifest, []);

  assert.match(one.html, /rr-query--empty/);
  assert.match(two.html, /href="\/one"/);
});

test("a non-mapping block reports an error and renders the error state", () => {
  const source = "- a\n- b";
  const one = entry("one", {}, `<p>x</p>${createQueryPlaceholder(source)}`);
  const manifest = manifestOf([one]);
  const diagnostics: Diagnostic[] = [];

  createQueryRuntime({}).resolve(manifest, diagnostics);

  assert.match(one.html, /^<p>x<\/p><div class="rr-query rr-query--error"/);
  assert.equal(diagnostics[0]?.code, "content-query-invalid");
  assert.equal(diagnostics[0]?.severity, "error");
  assert.equal(diagnostics[0]?.pluginName, "query");
  assert.match(diagnostics[0]?.message ?? "", /must be a YAML mapping/);
  assert.match(diagnostics[0]?.message ?? "", /`one`/);
});

test("an undecodable placeholder reports a decode error", () => {
  const one = entry("one", {}, '<div data-rr-query="%E0%A4%A"></div>');
  const manifest = manifestOf([one]);
  const diagnostics: Diagnostic[] = [];

  createQueryRuntime({}).resolve(manifest, diagnostics);

  assert.equal(diagnostics[0]?.code, "content-query-invalid");
  assert.match(diagnostics[0]?.message ?? "", /could not be decoded/);
});

test("unknown query fields warn but still run the query", () => {
  const source = "foo: bar";
  const one = entry("one", {}, createQueryPlaceholder(source));
  const manifest = manifestOf([one]);
  const diagnostics: Diagnostic[] = [];

  createQueryRuntime({}).resolve(manifest, diagnostics);

  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]?.code, "content-query-unknown-field");
  assert.equal(diagnostics[0]?.severity, "warning");
  assert.match(diagnostics[0]?.message ?? "", /`foo`/);
  assert.match(one.html, /data-rr-query-result/);
});

test("an empty block renders every entry and leaves other html untouched", () => {
  const source = "";
  const one = entry("one", {}, createQueryPlaceholder(source));
  const other = entry("other", {}, "<p>plain</p>");
  const manifest = manifestOf([one, other]);

  createQueryRuntime({}).resolve(manifest, []);

  assert.match(one.html, /data-rr-query-result/);
  assert.match(one.html, /href="\/one"/);
  assert.equal(other.html, "<p>plain</p>");
});
