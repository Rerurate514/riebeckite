import assert from "node:assert/strict";
import { test } from "node:test";
import type { ContentManifestEntry } from "@riebeckite/core";
import {
  buildGlossary,
  renderGlossaryPage,
  resolveGlossaryOptions,
} from "../index.ts";

function entry(
  slug: string,
  frontmatter: Record<string, unknown>,
): ContentManifestEntry {
  return {
    slug,
    permalink: `/${slug}`,
    publicLocation: { slug, permalink: `/${slug}` },
    title: slug,
    frontmatter,
    html: "",
    publishing: { visibility: "public", routable: true, discoverable: true },
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
  };
}

test("glossary selects marked notes and sorts terms", () => {
  const entries = buildGlossary(
    [
      entry("z", { glossary: true, term: "Zebra" }),
      entry("a", { glossary: true, definition: "First" }),
      entry("ignored", { term: "Ignored" }),
    ],
    resolveGlossaryOptions(),
  );
  assert.deepEqual(
    entries.map(({ term, definition }) => ({ term, definition })),
    [
      { term: "a", definition: "First" },
      { term: "Zebra", definition: null },
    ],
  );
});

test("glossary page escapes terms and definitions", () => {
  const page = renderGlossaryPage(
    [{ term: "A < B", definition: "x & y", permalink: "/a?x=1&y=2" }],
    resolveGlossaryOptions(),
  );
  assert.match(page.html, /A &lt; B/);
  assert.match(page.html, /x &amp; y/);
  assert.match(page.html, /href="\/a\?x=1&amp;y=2"/);
});
