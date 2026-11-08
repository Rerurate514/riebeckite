import assert from "node:assert/strict";
import { test } from "node:test";
import type { ContentManifest } from "@riebeckite/core";
import { reactions } from "../index.ts";
import { REACTIONS_ATTRIBUTE } from "../src/render.js";

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

test("onManifestCreated appends reactions HTML to entries with contentId", async () => {
  const plugin = reactions();
  const manifest = manifestWith([
    { slug: "post", contentId: "post-1", html: "<p>body</p>" },
    { slug: "no-id", html: "<p>no content id</p>" },
  ]);

  const hook = plugin.onManifestCreated;
  assert.ok(hook);
  await hook({ manifest } as never);

  assert.ok(manifest.entries[0].html.includes(REACTIONS_ATTRIBUTE));
  assert.ok(manifest.entries[0].html.includes('data-content-id="post-1"'));
  assert.ok(!manifest.entries[1].html.includes(REACTIONS_ATTRIBUTE));
});
