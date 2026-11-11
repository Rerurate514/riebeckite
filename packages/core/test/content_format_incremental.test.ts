import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { ContentManager, definePlugin } from "../index.js";
import {
  contentTestConfig,
  memoryContentSource,
} from "./support/content_fixture.js";

const directories: string[] = [];

after(async () => {
  await Promise.all(
    directories.map((directory) =>
      fs.rm(directory, { recursive: true, force: true }),
    ),
  );
});

async function createDirectory() {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-content-format-"),
  );
  directories.push(directory);
  return directory;
}

function formatPlugin(processed: string[], version = "v1", enabled = true) {
  return definePlugin({
    name: "scenario-format",
    cacheVersion: version,
    contentFormats: enabled
      ? [
          {
            extension: ".mdx",
            process: async ({
              slug,
              source,
            }: {
              slug: string;
              source: string;
            }) => {
              processed.push(slug);
              return {
                frontmatter: { publish: true, title: slug },
                html: `<p>${source.trim()}</p>`,
              };
            },
            dependencies: ({ source }: { source: string }) =>
              source.includes("card") ? ["card.tsx"] : [],
          },
        ]
      : [],
    processedContentCache: { version, dependencyMode: "tracked" },
  });
}

async function build(
  directory: string,
  files: Record<string, string>,
  processed: string[],
  version = "v1",
  enabled = true,
) {
  const config = contentTestConfig(directory, [
    formatPlugin(processed, version, enabled),
  ]);
  const manager = new ContentManager(memoryContentSource(files), [], {
    config,
    plugins: config.plugins,
  });
  try {
    return await manager.build({ incremental: true });
  } finally {
    manager.dispose();
  }
}

function entryFor(manifest: Awaited<ReturnType<typeof build>>, slug: string) {
  return manifest.entries.find((entry) => entry.slug === slug);
}

test("incremental builds follow content format changes", async (t) => {
  const directory = await createDirectory();
  const processed: string[] = [];
  const files: Record<string, string> = {
    "first.mdx": "# First",
    "second.mdx": "# Second\n\nimport Card from './card'\n\n<Card />",
    "card.tsx": "export const version = 1;",
  };

  await t.test("cold build processes every entry", async () => {
    const manifest = await build(directory, files, processed);
    assert.deepEqual(processed.toSorted(), ["first", "second"]);
    assert.equal(
      entryFor(manifest, "second")?.html,
      "<p># Second\n\nimport Card from './card'\n\n<Card /></p>",
    );
  });

  await t.test("warm build reuses unchanged entries", async () => {
    processed.length = 0;
    await build(directory, files, processed);
    assert.deepEqual(processed, []);
  });

  await t.test("editing MDX body reprocesses only that entry", async () => {
    processed.length = 0;
    files["second.mdx"] = "# Second changed";
    const manifest = await build(directory, files, processed);
    assert.deepEqual(processed, ["second"]);
    assert.equal(entryFor(manifest, "second")?.html, "<p># Second changed</p>");
  });

  await t.test(
    "editing an imported file reprocesses the MDX entry",
    async () => {
      processed.length = 0;
      files["card.tsx"] = "export const version = 2;";
      await build(directory, files, processed);
      assert.deepEqual(processed, ["second"]);
    },
  );

  await t.test("adding an MDX entry processes only the new entry", async () => {
    processed.length = 0;
    files["third.mdx"] = "# Third";
    const manifest = await build(directory, files, processed);
    assert.deepEqual(processed, ["third"]);
    assert.ok(entryFor(manifest, "third"));
  });

  await t.test("removing an MDX entry drops its output", async () => {
    processed.length = 0;
    delete files["third.mdx"];
    const manifest = await build(directory, files, processed);
    assert.deepEqual(processed, []);
    assert.equal(entryFor(manifest, "third"), undefined);
  });

  await t.test("moving an MDX entry replaces the old slug", async () => {
    processed.length = 0;
    files["renamed.mdx"] = files["first.mdx"] ?? "";
    delete files["first.mdx"];
    const manifest = await build(directory, files, processed);
    assert.deepEqual(processed, ["renamed"]);
    assert.equal(entryFor(manifest, "first"), undefined);
    assert.ok(entryFor(manifest, "renamed"));
  });

  await t.test(
    "changing the plugin cache version regenerates entries",
    async () => {
      processed.length = 0;
      await build(directory, files, processed, "v2");
      assert.deepEqual(processed.toSorted(), ["renamed", "second"]);
    },
  );

  await t.test("disabling the content format ignores MDX entries", async () => {
    processed.length = 0;
    const manifest = await build(directory, files, processed, "v2", false);
    assert.deepEqual(processed, []);
    assert.equal(entryFor(manifest, "renamed"), undefined);
    assert.equal(entryFor(manifest, "second"), undefined);
  });
});

test("content format slug collisions fail the build", async () => {
  const directory = await createDirectory();
  const processed: string[] = [];
  await assert.rejects(
    build(
      directory,
      {
        "note.md": "---\npublish: true\n---\n# Note",
        "note.mdx": "# Note",
      },
      processed,
    ),
    /Content slug collision for "note"/,
  );
});
