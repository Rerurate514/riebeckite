import assert from "node:assert/strict";
import { test } from "node:test";
import { defineContentMigration } from "../src/migration/migration_registry.js";
import {
  applyContentMigration,
  diffFrontmatter,
  parseMigrationContent,
} from "../src/migration/migration_transform.js";

function content(path: string, markdown: string) {
  const parsed = parseMigrationContent(path, markdown);
  assert.ok(parsed.content);
  return parsed.content;
}

test("declarative rules express the category migration example", () => {
  const migration = defineContentMigration({
    id: "category-to-tags",
    version: 1,
    description: "Move category into tags and publish explicitly.",
    rules: [
      {
        kind: "frontmatter-append",
        key: "tags",
        value: (entry) => entry.frontmatter.category,
      },
      { kind: "frontmatter-remove", key: "category" },
      { kind: "frontmatter-remove", key: "published" },
      { kind: "visibility", visibility: "public" },
    ],
  });

  const before = content(
    "note.md",
    [
      "---",
      "category: programming",
      "published: true",
      "---",
      "",
      "# Note",
    ].join("\n"),
  );
  const result = applyContentMigration(before, migration);

  assert.equal(result.selected, true);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.content.frontmatter.tags, ["programming"]);
  assert.equal(result.content.frontmatter.category, undefined);
  assert.equal(result.content.frontmatter.published, undefined);
  assert.equal(result.content.frontmatter.visibility, "public");
  assert.equal(result.content.markdown, before.markdown);

  const again = applyContentMigration(result.content, migration);
  assert.deepEqual(
    diffFrontmatter(result.content.frontmatter, again.content.frontmatter),
    { set: {}, remove: [] },
  );
});

test("rules support conditions, renaming, mapping, and list normalization", () => {
  const migration = defineContentMigration({
    id: "normalize-metadata",
    version: 1,
    description: "Normalize legacy metadata.",
    rules: [
      {
        kind: "frontmatter-rename",
        from: "summary",
        to: "description",
        when: (entry) => entry.frontmatter.description === undefined,
      },
      {
        kind: "frontmatter-map",
        key: "draft",
        map: (value) => (value === true ? "hidden" : undefined),
      },
      {
        kind: "frontmatter-map",
        key: "legacy",
        map: () => undefined,
      },
      {
        kind: "frontmatter-normalize-list",
        key: "tags",
        separator: /[\s,]+/u,
      },
      {
        kind: "frontmatter-append",
        key: "tags",
        value: "migrated",
      },
    ],
  });

  const before = content(
    "note.md",
    [
      "---",
      "summary: legacy",
      "draft: true",
      "legacy: remove-me",
      "tags: ['#a, b  a']",
      "---",
    ].join("\n"),
  );
  const result = applyContentMigration(before, migration);

  assert.equal(result.content.frontmatter.description, "legacy");
  assert.equal(result.content.frontmatter.summary, undefined);
  assert.equal(result.content.frontmatter.draft, "hidden");
  assert.equal(result.content.frontmatter.legacy, undefined);
  assert.deepEqual(result.content.frontmatter.tags, ["a", "b", "migrated"]);
});

test("renaming onto an existing key reports a warning and keeps data", () => {
  const migration = defineContentMigration({
    id: "rename-existing",
    version: 1,
    description: "Rename only when possible.",
    rules: [{ kind: "frontmatter-rename", from: "summary", to: "description" }],
  });
  const result = applyContentMigration(
    content(
      "note.md",
      ["---", "summary: a", "description: b", "---"].join("\n"),
    ),
    migration,
  );

  assert.equal(result.content.frontmatter.summary, "a");
  assert.equal(result.content.frontmatter.description, "b");
  assert.deepEqual(
    result.diagnostics.map((diagnostic) => diagnostic.code),
    ["frontmatter-rename-target-exists"],
  );
});

test("content id and permalink changes preserve the previous permalink", () => {
  const migration = defineContentMigration({
    id: "stable-url",
    version: 2,
    description: "Move a note to a stable URL.",
    rules: [
      { kind: "content-id", id: "note-stable" },
      { kind: "permalink", permalink: "/notes/stable" },
    ],
  });
  const result = applyContentMigration(
    content(
      "notes/old.md",
      ["---", "id: legacy", "permalink: /notes/old", "---"].join("\n"),
    ),
    migration,
  );

  assert.equal(result.content.frontmatter.id, "note-stable");
  assert.equal(result.content.frontmatter.permalink, "/notes/stable");
  assert.deepEqual(result.content.frontmatter.redirect_from, ["/notes/old"]);

  const again = applyContentMigration(result.content, migration);
  assert.deepEqual(again.content.frontmatter.redirect_from, ["/notes/old"]);
});

test("an invalid permalink is a diagnostic rather than a change", () => {
  const migration = defineContentMigration({
    id: "bad-permalink",
    version: 1,
    description: "Reject non-absolute permalinks.",
    rules: [{ kind: "permalink", permalink: "notes/relative" }],
  });
  const result = applyContentMigration(
    content("note.md", ["---", "permalink: /old", "---"].join("\n")),
    migration,
  );

  assert.equal(result.content.frontmatter.permalink, "/old");
  assert.deepEqual(
    result.diagnostics.map((diagnostic) => diagnostic.code),
    ["invalid-permalink"],
  );
});

test("path renames move files and directories", () => {
  const migration = defineContentMigration({
    id: "move-notes",
    version: 1,
    description: "Move notes into a folder.",
    rules: [{ kind: "path-rename", from: "notes", to: "journal/notes" }],
  });

  assert.equal(
    applyContentMigration(content("notes/a.md", ""), migration).content.path,
    "journal/notes/a.md",
  );
  assert.equal(
    applyContentMigration(content("other/a.md", ""), migration).content.path,
    "other/a.md",
  );
});

test("transform and validate hooks run after declarative rules", () => {
  const migration = defineContentMigration({
    id: "hook",
    version: 1,
    description: "Use code for a value a rule cannot express.",
    rules: [{ kind: "frontmatter-set", key: "stage", value: "done" }],
    transform: (entry) => ({
      set: { slug: entry.path.replace(/\.md$/u, "") },
      diagnostics: [
        {
          severity: "info",
          code: "transformed",
          message: "Transformed by hook.",
          path: entry.path,
        },
      ],
    }),
    validate: (entry) =>
      entry.frontmatter.slug
        ? []
        : [
            {
              severity: "error",
              code: "missing-slug",
              message: "Slug is missing.",
              path: entry.path,
            },
          ],
  });
  const result = applyContentMigration(content("a.md", ""), migration);

  assert.equal(result.content.frontmatter.stage, "done");
  assert.equal(result.content.frontmatter.slug, "a");
  assert.deepEqual(
    result.diagnostics.map((diagnostic) => diagnostic.code),
    ["transformed"],
  );
});

test("selector failures and thrown transforms become error diagnostics", () => {
  const migration = defineContentMigration({
    id: "throwing",
    version: 1,
    description: "Fail safely.",
    select: () => {
      throw new Error("selector boom");
    },
  });
  const result = applyContentMigration(content("a.md", ""), migration);

  assert.equal(result.selected, false);
  assert.equal(result.diagnostics[0]?.code, "migration-select-failed");

  const failing = defineContentMigration({
    id: "failing-transform",
    version: 1,
    description: "Fail safely.",
    transform: () => {
      throw new Error("transform boom");
    },
  });
  const failed = applyContentMigration(content("a.md", ""), failing);
  assert.equal(failed.diagnostics[0]?.code, "migration-transform-failed");
});

test("unsafe transformed paths are rejected", () => {
  const migration = defineContentMigration({
    id: "unsafe-path",
    version: 1,
    description: "Attempt traversal.",
    transform: () => ({ path: "../outside.md" }),
  });
  const result = applyContentMigration(content("a.md", ""), migration);

  assert.equal(result.content.path, "a.md");
  assert.deepEqual(
    result.diagnostics.map((diagnostic) => diagnostic.code),
    ["invalid-content-path"],
  );
});

test("invalid frontmatter is a parse diagnostic", () => {
  const parsed = parseMigrationContent(
    "broken.md",
    ["---", "tags: [unclosed", "---", "body"].join("\n"),
  );

  assert.equal(parsed.content, undefined);
  assert.equal(parsed.diagnostics[0]?.code, "frontmatter-parse-failed");
});

test("non-mapping frontmatter is rejected", () => {
  const parsed = parseMigrationContent(
    "list.md",
    ["---", "- a", "---"].join("\n"),
  );

  assert.equal(parsed.content, undefined);
  assert.equal(parsed.diagnostics[0]?.code, "frontmatter-not-object");
});
