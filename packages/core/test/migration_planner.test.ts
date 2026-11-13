import assert from "node:assert/strict";
import test from "node:test";
import {
  type ContentMutationOperation,
  createContentMigrationRegistry,
  defineContentMigration,
  planContentMigrationBatch,
} from "../index.js";

function migration(input: Parameters<typeof defineContentMigration>[0]) {
  return defineContentMigration(input);
}

test("plans the category/published conversion and re-runs without changes", () => {
  const legacy = migration({
    id: "legacy-frontmatter",
    version: 1,
    description: "Convert legacy category and published fields.",
    rules: [
      {
        kind: "frontmatter-map",
        key: "category",
        map: (value) => [String(value)],
      },
      {
        kind: "frontmatter-rename",
        from: "category",
        to: "tags",
      },
      {
        kind: "frontmatter-set",
        key: "visibility",
        value: (content) =>
          content.frontmatter.published === true ? "public" : "draft",
        when: (content) => content.frontmatter.published !== undefined,
      },
      {
        kind: "frontmatter-remove",
        key: "published",
      },
    ],
  });
  const before = [
    {
      path: "one.md",
      content: "---\ncategory: programming\npublished: true\n---\n# One\n",
    },
    {
      path: "two.md",
      content: "---\ncategory: life\npublished: false\n---\n# Two\n",
    },
  ];
  const batch = planContentMigrationBatch({
    migrations: [legacy],
    files: before,
  });
  assert.deepEqual(batch.operations, [
    {
      kind: "frontmatter",
      path: "one.md",
      set: {
        tags: ["programming"],
        visibility: "public",
      },
      remove: ["category", "published"],
    },
    {
      kind: "frontmatter",
      path: "two.md",
      set: {
        tags: ["life"],
        visibility: "draft",
      },
      remove: ["category", "published"],
    },
  ]);
  assert.equal(batch.impact.files, 2);
  assert.deepEqual(batch.diagnostics, []);

  const after = batch.files.map((file) => ({
    path: file.path,
    content: `---\n${Object.entries(file.frontmatter)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join("\n")}\n---\n# Body\n`,
  }));
  const rerun = planContentMigrationBatch({
    migrations: [legacy],
    files: after,
  });
  assert.deepEqual(rerun.operations, []);
  assert.deepEqual(rerun.skipped, [
    { migrationId: "legacy-frontmatter", version: 1, reason: "no-change" },
  ]);
});

test("applies conditional rules and removes unknown legacy keys", () => {
  const stale = migration({
    id: "stale",
    version: 1,
    description: "Remove obsolete fields.",
    rules: [
      {
        kind: "frontmatter-remove",
        key: "draft",
        when: (content) => content.frontmatter.visibility === "public",
      },
      {
        kind: "frontmatter-rename",
        from: "summary",
        to: "description",
        when: (content) => typeof content.frontmatter.summary === "string",
      },
    ],
  });
  const batch = planContentMigrationBatch({
    migrations: [stale],
    files: [
      {
        path: "post.md",
        content:
          "---\nvisibility: public\nsummary: Hello\ndraft: true\n---\nBody",
      },
      {
        path: "draft.md",
        content: "---\nvisibility: draft\ndraft: true\n---\nBody",
      },
    ],
  });
  assert.deepEqual(batch.operations, [
    {
      kind: "frontmatter",
      path: "post.md",
      set: { description: "Hello" },
      remove: ["draft", "summary"],
    },
  ]);
});

test("moves a file and preserves the previous permalink as a redirect", () => {
  const move = migration({
    id: "move-guides",
    version: 1,
    description: "Move guides into a folder.",
    rules: [{ kind: "path-rename", from: "guide.md", to: "guides/guide.md" }],
  });
  const batch = planContentMigrationBatch({
    migrations: [move],
    files: [
      {
        path: "guide.md",
        content: "---\ntitle: Guide\n---\n# Guide",
      },
    ],
    beforePermalinks: new Map([["guide.md", "/guide"]]),
  });
  assert.deepEqual(batch.operations, [
    { kind: "move", from: "guide.md", to: "guides/guide.md" },
    {
      kind: "frontmatter",
      path: "guides/guide.md",
      set: { redirect_from: ["/guide"] },
      remove: [],
    },
  ]);
  assert.equal(batch.diffs[0]?.from, "guides/guide.md");
});

test("does not add a redirect when the permalink stays explicit and unchanged", () => {
  const move = migration({
    id: "move-kept",
    version: 1,
    description: "Move without changing URLs.",
    rules: [{ kind: "path-rename", from: "guide.md", to: "guides/guide.md" }],
  });
  const batch = planContentMigrationBatch({
    migrations: [move],
    files: [
      {
        path: "guide.md",
        content: "---\npermalink: /guide\n---\n# Guide",
      },
    ],
    beforePermalinks: new Map([["guide.md", "/guide"]]),
  });
  assert.deepEqual(batch.operations, [
    { kind: "move", from: "guide.md", to: "guides/guide.md" },
  ]);
});

test("orders independent moves deterministically", () => {
  const move = migration({
    id: "move-many",
    version: 1,
    description: "Move two files.",
    rules: [
      { kind: "path-rename", from: "b.md", to: "z/b.md" },
      { kind: "path-rename", from: "a.md", to: "z/a.md" },
    ],
  });
  const batch = planContentMigrationBatch({
    migrations: [move],
    files: [
      { path: "b.md", content: "---\ntitle: B\n---\n" },
      { path: "a.md", content: "---\ntitle: A\n---\n" },
    ],
  });
  assert.deepEqual(batch.operations, [
    { kind: "move", from: "a.md", to: "z/a.md" },
    { kind: "move", from: "b.md", to: "z/b.md" },
  ]);
});

test("reports duplicate destinations instead of guessing", () => {
  const collide = migration({
    id: "collide",
    version: 1,
    description: "Collide two files.",
    transform: () => ({ path: "same.md" }),
  });
  const batch = planContentMigrationBatch({
    migrations: [collide],
    files: [
      { path: "a.md", content: "---\ntitle: A\n---\n" },
      { path: "b.md", content: "---\ntitle: B\n---\n" },
    ],
  });
  assert.ok(
    batch.diagnostics.some(
      (diagnostic) => diagnostic.code === "path-collision",
    ),
  );
});

test("reports cyclic path swaps", () => {
  const swap = createContentMigrationRegistry([
    {
      id: "a-to-b",
      version: 1,
      description: "A to B.",
      select: (content) => content.frontmatter.key === "a",
      rules: [{ kind: "path-rename", from: "a.md", to: "b.md" }],
    },
    {
      id: "b-to-a",
      version: 1,
      description: "B to A.",
      select: (content) => content.frontmatter.key === "b",
      rules: [{ kind: "path-rename", from: "b.md", to: "a.md" }],
    },
  ]);
  const batch = planContentMigrationBatch({
    migrations: swap.order,
    files: [
      { path: "a.md", content: "---\nkey: a\n---\n" },
      { path: "b.md", content: "---\nkey: b\n---\n" },
    ],
  });
  assert.ok(
    batch.diagnostics.some((diagnostic) => diagnostic.code === "path-cycle"),
  );
});

test("malformed frontmatter is a diagnostic and is not transformed", () => {
  const set = migration({
    id: "set-title",
    version: 1,
    description: "Set a title.",
    rules: [{ kind: "frontmatter-set", key: "title", value: "Hello" }],
  });
  const batch = planContentMigrationBatch({
    migrations: [set],
    files: [
      { path: "broken.md", content: "---\ntitle: [\n---\nBody" },
      { path: "ok.md", content: "---\nother: value\n---\nBody" },
    ],
  });
  assert.ok(
    batch.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === "frontmatter-parse-failed" &&
        diagnostic.path === "broken.md",
    ),
  );
  assert.deepEqual(
    batch.operations.map((operation) =>
      operation.kind === "frontmatter" ? operation.path : operation.kind,
    ),
    ["ok.md"],
  );
});

test("records selections and no-selection skips", () => {
  const conditional = migration({
    id: "conditional",
    version: 1,
    description: "Only touch drafts.",
    select: (content) => content.frontmatter.draft === true,
    rules: [{ kind: "visibility", visibility: "draft" }],
  });
  const batch = planContentMigrationBatch({
    migrations: [conditional],
    files: [
      { path: "draft.md", content: "---\ndraft: true\n---\n" },
      { path: "published.md", content: "---\ndraft: false\n---\n" },
    ],
  });
  assert.deepEqual(batch.selections, [
    { migrationId: "conditional", version: 1, paths: ["draft.md"] },
  ]);
  assert.deepEqual(batch.operations, [
    {
      kind: "frontmatter",
      path: "draft.md",
      set: { visibility: "draft" },
      remove: [],
    },
  ]);
});

test("unsafe transform paths are rejected with a diagnostic", () => {
  const unsafe = migration({
    id: "unsafe",
    version: 1,
    description: "Try to escape.",
    transform: () => ({ path: "../outside.md" }),
  });
  const batch = planContentMigrationBatch({
    migrations: [unsafe],
    files: [{ path: "safe.md", content: "---\ntitle: Safe\n---\n" }],
  });
  assert.ok(
    batch.diagnostics.some(
      (diagnostic) => diagnostic.code === "invalid-content-path",
    ),
  );
  assert.deepEqual(batch.operations, []);
});

test("permalink rule and path move do not duplicate redirects", () => {
  const move = migration({
    id: "move-and-rename",
    version: 1,
    description: "Move and override the permalink.",
    rules: [
      { kind: "path-rename", from: "old.md", to: "new.md" },
      { kind: "permalink", permalink: "/new-url" },
    ],
  });
  const batch = planContentMigrationBatch({
    migrations: [move],
    files: [{ path: "old.md", content: "---\npermalink: /old-url\n---\nBody" }],
    beforePermalinks: new Map([["old.md", "/old-url"]]),
  });
  const frontmatter = batch.operations.find(
    (operation) => operation.kind === "frontmatter",
  );
  assert.ok(frontmatter && frontmatter.kind === "frontmatter");
  assert.deepEqual(frontmatter.set, {
    permalink: "/new-url",
    redirect_from: ["/old-url"],
  });
});

test("writes redirects to the configured redirect field", () => {
  const move = migration({
    id: "move-and-rename",
    version: 1,
    description: "Move and override the permalink.",
    rules: [
      { kind: "path-rename", from: "old.md", to: "new.md" },
      { kind: "permalink", permalink: "/new-url" },
    ],
  });
  const batch = planContentMigrationBatch({
    migrations: [move],
    files: [{ path: "old.md", content: "---\npermalink: /old-url\n---\nBody" }],
    beforePermalinks: new Map([["old.md", "/old-url"]]),
    redirectField: "previous_urls",
  });
  const frontmatter = batch.operations.find(
    (operation) => operation.kind === "frontmatter",
  );
  assert.ok(frontmatter && frontmatter.kind === "frontmatter");
  assert.deepEqual(frontmatter.set, {
    permalink: "/new-url",
    previous_urls: ["/old-url"],
  });
});

test("frontmatter operations follow moves", () => {
  const move = migration({
    id: "move-order",
    version: 1,
    description: "Move and retitle.",
    rules: [
      { kind: "path-rename", from: "one.md", to: "two/one.md" },
      { kind: "frontmatter-set", key: "title", value: "Moved" },
    ],
  });
  const batch = planContentMigrationBatch({
    migrations: [move],
    files: [{ path: "one.md", content: "---\ntitle: Old\n---\n" }],
  });
  const kinds = batch.operations.map(
    (operation: ContentMutationOperation) => operation.kind,
  );
  assert.deepEqual(kinds, ["move", "frontmatter"]);
  const frontmatter = batch.operations[1];
  assert.ok(frontmatter && frontmatter.kind === "frontmatter");
  assert.equal(frontmatter.path, "two/one.md");
});
