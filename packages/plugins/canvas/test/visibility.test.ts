import assert from "node:assert/strict";
import { test } from "node:test";
import type { ContentManifest, ContentManifestEntry } from "@riebeckite/core";
import { CANVAS_NOTE_HREF } from "../index.ts";
import { createCanvasRuntime } from "../src/runtime.ts";

function entry(
  slug: string,
  routable: boolean,
  noteLinks: readonly string[] = [],
): ContentManifestEntry {
  const permalink = `/${slug}`;
  return {
    slug,
    permalink,
    publicLocation: { slug, permalink },
    title: slug,
    frontmatter: {},
    html: noteLinks
      .map(
        (target) =>
          `<a class="rb-canvas__note" href="${CANVAS_NOTE_HREF}" data-canvas-note="${encodeURIComponent(target)}">${target}</a>`,
      )
      .join(""),
    publishing: {
      visibility: routable ? "public" : "draft",
      routable,
      discoverable: routable,
    },
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
  };
}

function manifestOf(entries: ContentManifestEntry[]): ContentManifest {
  return {
    entries,
    publicEntries: entries.filter((item) => item.publishing.routable),
    discoverableEntries: entries.filter((item) => item.publishing.discoverable),
    bySlug: new Map(entries.map((item) => [item.slug, item])),
  } as unknown as ContentManifest;
}

test("canvas note links ignore non-routable targets", () => {
  const manifest = manifestOf([
    entry("page", true, ["public", "hidden"]),
    entry("public", true),
    entry("hidden", false),
  ]);

  createCanvasRuntime().resolve(manifest);
  const html = manifest.bySlug.get("page")?.html ?? "";

  assert.match(html, /href="\/public"/);
  assert.match(html, /data-canvas-note="hidden"/);
  assert.match(html, /href="#"/);
  assert.doesNotMatch(html, /href="\/hidden"/);
});
