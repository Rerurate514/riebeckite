import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ContentManifestEntry,
  createContentManifestEntry,
} from "@riebeckite/core";
import { parseBases } from "../index.js";
import { renderBases } from "../src/render.js";

function entry(slug: string, title: string): ContentManifestEntry {
  return createContentManifestEntry({
    slug,
    permalink: `/${slug}`,
    title,
    tags: [],
    links: [],
    frontmatter: {},
  });
}
const entries = [entry("a", "Alpha"), entry("b", "Beta")];

test("parses and renders the read-only list view", () => {
  const parsed = parseBases({
    views: [{ type: "list" }, { type: "list", name: "Grouped" }],
  });
  assert.equal(parsed.ok, true);
  const html = renderBases(parsed.value, {}, entries, "views: []");

  assert.match(html, /data-bases-view="list"/);
  assert.match(html, /<ul class="rb-bases__list">/);
  assert.match(html, /href="\/a">Alpha<\/a>/);
  assert.match(html, /href="\/b">Beta<\/a>/);
});

test("renders group headings for grouped list views", () => {
  const parsed = parseBases({
    views: [{ type: "list", groupBy: { property: "file.name" } }],
  });
  assert.equal(parsed.ok, true);
  const html = renderBases(parsed.value, {}, entries, "");

  assert.match(html, /rb-bases__group-title">a\.md/);
  assert.match(html, /rb-bases__group-title">b\.md/);
});

test("keeps unsupported view types renderable and explains them", () => {
  const parsed = parseBases({
    views: [{ type: "table" }, { type: "map" }, { type: "kanban" }],
  });
  assert.equal(parsed.ok, true);
  const html = renderBases(parsed.value, {}, entries, "");

  assert.match(html, /<table class="rb-bases__table">/);
  assert.match(html, /map views are not available in a static build\./);
  assert.match(html, /kanban views are not available in a static build\./);
});

test("rejects unknown view types", () => {
  const parsed = parseBases({ views: [{ type: "gallery" }] });

  assert.equal(parsed.ok, false);
  assert.match(
    parsed.ok === false ? parsed.message : "",
    /must be "table", "cards", "list", "map", or "kanban"/,
  );
});
