import assert from "node:assert/strict";
import { test } from "node:test";
import type { ContentManifest, ContentManifestEntry } from "@riebeckite/core";
import { createKanbanLinkResolver } from "../index.ts";

function entry(slug: string, routable: boolean): ContentManifestEntry {
  const permalink = `/${slug}`;
  return {
    slug,
    permalink,
    publicLocation: { slug, permalink },
    title: slug,
    frontmatter: {},
    html: "",
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
    contentIndex: new Map(
      entries.map((item) => [item.slug.toLowerCase(), item.slug]),
    ),
  } as unknown as ContentManifest;
}

test("kanban link resolver ignores non-routable targets", () => {
  const resolver = createKanbanLinkResolver(
    manifestOf([entry("public", true), entry("hidden", false)]),
  );

  assert.deepEqual(resolver("Public"), { href: "/public", label: "Public" });
  assert.equal(resolver("Hidden"), null);
});
