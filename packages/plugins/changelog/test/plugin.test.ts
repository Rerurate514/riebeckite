import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  resolveConfig,
} from "@riebeckite/core";
import { changelog } from "../index.ts";
import {
  createTestRepository,
  gitAvailable,
} from "./support/git_repository.ts";

const options = { skip: !gitAvailable };

const NOTE_SLOT = "article.after-content";

function memorySource(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

function notes() {
  return {
    "hello.md": "---\npublish: true\ntitle: Hello\n---\n# Hello",
    "changelog.md": "---\npublish: true\ntitle: Changelog\n---\n# Changelog",
  };
}

/**
 * The build working directory and the content directory are different places
 * in a monorepo, and so is the repository root. The plugin must read Git
 * through the configured content directory, not through `process.cwd()`.
 */
test(
  "per-note history comes from the configured content directory",
  options,
  async () => {
    const repository = createTestRepository("riebeckite-changelog-plugin-");
    try {
      repository.commit(
        { "notes/hello.md": "# Hello\n" },
        "add hello",
        "2024-01-01T00:00:00+00:00",
      );
      repository.commit(
        { "notes/hello.md": "# Hello\n\nmore\n" },
        "extend hello",
        "2024-01-02T00:00:00+00:00",
      );

      const manifest = await new ContentManager(memorySource(notes()), [], {
        config: resolveConfig({
          site: { title: "Test" },
          content: { directory: repository.contentRoot },
          plugins: [changelog()],
        }),
      }).getManifest();

      const entry = manifest.publicEntries.find(
        (candidate) => candidate.slug === "hello",
      );
      const slot = entry?.bodySlots?.[NOTE_SLOT];

      assert.ok(slot, "expected a change history section on the note");
      assert.ok(slot.includes("data-changelog-note"));
      assert.ok(slot.includes("extend hello"));
      assert.ok(slot.includes("add hello"));
    } finally {
      repository.dispose();
    }
  },
);

test(
  "site-wide changelog links commits to the notes they touched",
  options,
  async () => {
    const repository = createTestRepository("riebeckite-changelog-site-");
    try {
      repository.commit(
        {
          "notes/hello.md": "# Hello\n",
          "notes/changelog.md": "# Changelog\n",
        },
        "add notes",
        "2024-01-01T00:00:00+00:00",
      );
      repository.commit(
        { "notes/hello.md": "# Hello\n\nmore\n" },
        "extend hello",
        "2024-01-02T00:00:00+00:00",
      );

      const manifest = await new ContentManager(memorySource(notes()), [], {
        config: resolveConfig({
          site: { title: "Test" },
          content: { directory: repository.contentRoot },
          plugins: [changelog({ siteWide: true, siteWideSlug: "changelog" })],
        }),
      }).getManifest();

      const target = manifest.publicEntries.find(
        (candidate) => candidate.slug === "changelog",
      );
      const slot = target?.bodySlots?.[NOTE_SLOT];

      assert.ok(slot, "expected a site-wide changelog section");
      assert.ok(slot.includes("data-changelog-site"));
      assert.ok(slot.includes("extend hello"));
      // The commit's changed paths are translated back to content-relative
      // paths, which is what lets them be matched against the content index.
      assert.ok(slot.includes("rr-changelog__note-link"));
      assert.ok(slot.includes(">Hello<"));
    } finally {
      repository.dispose();
    }
  },
);
