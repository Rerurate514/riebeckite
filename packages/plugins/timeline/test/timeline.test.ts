import assert from "node:assert/strict";
import { test } from "node:test";
import type { ContentManifestEntry } from "@riebeckite/core";
import {
  buildTimeline,
  renderTimelinePage,
  resolveTimelineOptions,
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

test("timeline selects marked public notes and orders them by date", () => {
  const entries = buildTimeline(
    [
      entry("later", { timeline: true, date: "2025-02-01" }),
      entry("ignored", { date: "2024-01-01" }),
      entry("first", { timeline: true, created: "2025-01-01" }),
    ],
    resolveTimelineOptions(),
  );
  assert.deepEqual(
    entries.map(({ date, title }) => ({ date, title })),
    [
      { date: "2025-01-01", title: "first" },
      { date: "2025-02-01", title: "later" },
    ],
  );
});

test("timeline page escapes content", () => {
  const page = renderTimelinePage(
    [{ date: "2025-01-01", permalink: "/a?x=1&y=2", title: "A < B" }],
    resolveTimelineOptions(),
  );
  assert.match(page.html, /href="\/a\?x=1&amp;y=2"/);
  assert.match(page.html, /A &lt; B/);
});
