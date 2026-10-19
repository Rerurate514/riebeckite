import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  resolveConfig,
} from "@riebeckite/core";
import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import {
  buildNoteChangeHistory,
  buildSiteChangelog,
  Changelog,
  changelog,
  GitChangelogReader,
  renderSiteChangelog,
  resolveChangelogOptions,
} from "../index.ts";
import {
  createTestRepository,
  gitAvailable,
} from "./support/git_repository.ts";

(globalThis as { React?: unknown }).React = { createElement, Fragment };

const options = { skip: !gitAvailable };

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
      assert.ok(entry, "expected hello entry");

      // Use GitChangelogReader configured with the content directory (not process.cwd())
      const reader = new GitChangelogReader({ cwd: repository.contentRoot });
      const commits = await reader.getFileHistory("hello.md");

      const history = buildNoteChangeHistory(
        entry,
        commits,
        resolveChangelogOptions(),
      );

      const component = renderToString(Changelog({ history }));

      assert.ok(
        component.includes("data-changelog-note"),
        "expected data-changelog-note attribute",
      );
      assert.ok(
        component.includes("extend hello"),
        "expected extend hello link",
      );
      assert.ok(component.includes("add hello"), "expected add hello link");
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

      // Build the site-wide changelog from the configured content directory
      const allCommits = await new GitChangelogReader({
        cwd: repository.contentRoot,
      }).getRecentCommits();
      const siteChangelog = buildSiteChangelog({
        entries: manifest.publicEntries,
        commits: allCommits,
        contentIndex: manifest.contentIndex,
        options: resolveChangelogOptions({
          siteWide: true,
          siteWideSlug: "changelog",
        }),
      });
      const html = renderSiteChangelog(
        siteChangelog,
        resolveChangelogOptions({ siteWide: true, siteWideSlug: "changelog" }),
      );

      assert.ok(
        html.includes("data-changelog-site"),
        "expected data-changelog-site attribute",
      );
      assert.ok(html.includes("extend hello"), "expected extend hello link");
      assert.ok(html.includes("rr-changelog__note-link"), "expected note link");
      assert.ok(html.includes(">Hello<"), "expected Hello title");
    } finally {
      repository.dispose();
    }
  },
);
