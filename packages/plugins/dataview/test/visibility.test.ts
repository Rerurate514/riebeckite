import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  resolveConfig,
} from "@riebeckite/core";
import { dataviewPlugin } from "../index.ts";

function source(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

function config() {
  return resolveConfig({
    site: { title: "Test" },
    content: { filters: { publishStrategy: "explicit" } },
  });
}

test("dataview queries exclude entries that are not discoverable", async () => {
  const content = new ContentManager(
    source({
      "index.md":
        "---\npublish: true\ntitle: Index\n---\n\n```dataview\nLIST\n```",
      "shown.md": "---\npublish: true\ntitle: Shown\n---\n# Shown",
      "hidden.md": "---\ntitle: SECRET_DATAVIEW_TITLE\n---\n# Hidden",
      "scheduled.md":
        "---\npublish: true\ntitle: SECRET_SCHEDULED_TITLE\npublishAt: 2999-01-01T00:00:00.000Z\n---\n# Scheduled",
      "unlisted.md":
        "---\npublish: true\ntitle: SECRET_UNLISTED_TITLE\nvisibility: unlisted\n---\n# Unlisted",
    }),
    [],
    { config: config(), plugins: [dataviewPlugin()] },
  );

  const manifest = await content.getManifest();
  const html = manifest.bySlug.get("index")?.html ?? "";

  assert.match(html, /Shown/);
  assert.doesNotMatch(html, /SECRET_DATAVIEW_TITLE/);
  assert.doesNotMatch(html, /SECRET_SCHEDULED_TITLE/);
  assert.doesNotMatch(html, /SECRET_UNLISTED_TITLE/);
  assert.doesNotMatch(html, /href="\/hidden"/);
  assert.doesNotMatch(html, /href="\/scheduled"/);
  assert.doesNotMatch(html, /href="\/unlisted"/);
});
