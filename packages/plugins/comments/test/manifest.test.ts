import assert from "node:assert/strict";
import { test } from "node:test";
import type { ContentManifest } from "@riebeckite/core";
import { comments } from "../index.ts";
import { COMMENTS_ATTRIBUTE } from "../src/render.js";

function manifestWith(
  entries: { slug: string; contentId?: string; html: string }[],
): ContentManifest {
  const manifestEntries = entries.map((e) => ({
    slug: e.slug,
    contentId: e.contentId,
    html: e.html,
    permalink: `/${e.slug}`,
    publicLocation: { kind: "page" as const },
    title: e.slug,
  }));
  return {
    entries: manifestEntries,
    publicEntries: manifestEntries,
    bySlug: new Map(manifestEntries.map((e) => [e.slug, e])),
    contentIndex: new Map(),
  } as unknown as ContentManifest;
}

test("onManifestCreated appends comments HTML to entries with contentId", async () => {
  const plugin = comments();
  const manifest = manifestWith([
    { slug: "post", contentId: "post-1", html: "<p>body</p>" },
  ]);

  const hook = plugin.onManifestCreated;
  assert.ok(hook);
  await hook({ manifest } as never);

  assert.ok(manifest.entries[0].html.includes(COMMENTS_ATTRIBUTE));
  assert.ok(manifest.entries[0].html.includes('data-content-id="post-1"'));
});
