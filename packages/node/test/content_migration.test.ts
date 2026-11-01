import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createContentMigrationRegistry,
  defineContentMigration,
  resolveConfig,
} from "@riebeckite/core";
import { permalink } from "../../plugins/permalink/index.js";
import { FileSystemContentMigration } from "../index.js";

test("plans a batch without touching files and verifies the future manifest", async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-migration-"),
  );
  try {
    await fs.mkdir(path.join(root, "legacy"), { recursive: true });
    await fs.writeFile(
      path.join(root, "legacy", "post.md"),
      "---\nid: post\ntitle: Post\ncategory: programming\npublished: true\n---\n# Post\n",
    );
    await fs.writeFile(
      path.join(root, "legacy", "other.md"),
      "---\nid: other\ntitle: Other\npublished: true\n---\nSee [[legacy/post]].\n",
    );
    const registry = createContentMigrationRegistry([
      defineContentMigration({
        id: "legacy-fields",
        version: 1,
        description: "Convert legacy fields.",
        rules: [
          { kind: "frontmatter-map", key: "category", map: (value) => [value] },
          { kind: "frontmatter-rename", from: "category", to: "tags" },
          {
            kind: "frontmatter-set",
            key: "visibility",
            value: "public",
            when: (content) =>
              (content.frontmatter as { published?: unknown }).published ===
              true,
          },
          { kind: "frontmatter-remove", key: "published" },
        ],
      }),
      defineContentMigration({
        id: "move-guides",
        version: 1,
        description: "Move legacy content to guides.",
        dependsOn: ["legacy-fields"],
        rules: [{ kind: "path-rename", from: "legacy", to: "guides" }],
      }),
    ]);
    const migration = new FileSystemContentMigration({
      contentDirectory: root,
      registry,
      plugins: [permalink({ path: { mode: "preserve" } })],
    });
    const plan = await migration.plan();
    assert.deepEqual(plan.conflicts, []);
    assert.equal(
      plan.operations.filter((operation) => operation.kind === "move").length,
      2,
    );
    assert.equal(plan.migrations.length, 2);
    assert.equal(plan.selections.length, 2);
    assert.match(
      plan.verification.beforePublicationFingerprint,
      /^[0-9a-f]{64}$/,
    );
    assert.notEqual(
      plan.verification.beforePublicationFingerprint,
      plan.verification.afterPublicationFingerprint,
    );
    assert.ok(
      plan.changes.some(
        (change) =>
          change.path === "legacy/post.md" && change.afterFingerprint === null,
      ),
    );
    assert.ok(plan.changes.some((change) => change.path === "guides/post.md"));
    const redirect = plan.operations.find(
      (operation) =>
        operation.kind === "frontmatter" &&
        operation.path === "guides/post.md" &&
        operation.set?.redirect_from !== undefined,
    );
    assert.ok(redirect && redirect.kind === "frontmatter");
    assert.deepEqual(redirect.set?.redirect_from, ["/n/legacy/post"]);

    const post = await fs.readFile(
      path.join(root, "legacy", "post.md"),
      "utf8",
    );
    assert.match(post, /category: programming/);
    assert.doesNotMatch(post, /visibility/);
    const other = await fs.readFile(
      path.join(root, "legacy", "other.md"),
      "utf8",
    );
    assert.match(other, /\[\[legacy\/post\]\]/);

    const saved = await migration.savePlan(plan);
    const loaded = await migration.loadPlan(saved);
    assert.equal(loaded.planFingerprint, plan.planFingerprint);
    assert.equal(loaded.id, plan.id);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("reports conflicts for invalid frontmatter without planning writes", async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-migration-"),
  );
  try {
    await fs.writeFile(path.join(root, "broken.md"), "---\ntitle: [\n---\n");
    await fs.writeFile(
      path.join(root, "valid.md"),
      "---\ntitle: Valid\n---\nBody\n",
    );
    const registry = createContentMigrationRegistry([
      defineContentMigration({
        id: "title",
        version: 1,
        description: "Set a title.",
        rules: [{ kind: "frontmatter-set", key: "title", value: "Changed" }],
      }),
    ]);
    const migration = new FileSystemContentMigration({
      contentDirectory: root,
      registry,
    });
    const plan = await migration.plan();
    assert.ok(
      plan.conflicts.some(
        (conflict) => conflict.code === "frontmatter-parse-failed",
      ),
    );
    assert.equal(
      (await fs.readFile(path.join(root, "valid.md"), "utf8")).includes(
        "Changed",
      ),
      false,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("uses the redirect field configured on the permalink plugin", async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-migration-redirect-"),
  );
  try {
    await fs.mkdir(path.join(root, "legacy"), { recursive: true });
    await fs.writeFile(
      path.join(root, "legacy", "post.md"),
      "---\nid: post\ntitle: Post\n---\n# Post\n",
    );
    const plugin = permalink({
      path: { mode: "preserve" },
      redirects: { frontmatter: "previous_urls" },
    });
    const migration = new FileSystemContentMigration({
      contentDirectory: root,
      registry: createContentMigrationRegistry([
        defineContentMigration({
          id: "move-legacy",
          version: 1,
          description: "Move legacy content.",
          rules: [{ kind: "path-rename", from: "legacy", to: "guides" }],
        }),
      ]),
      config: resolveConfig({
        site: { title: "Migration redirects" },
        content: { directory: root, filters: { publishStrategy: "explicit" } },
        plugins: [plugin],
      }),
      plugins: [plugin],
    });
    const plan = await migration.plan();
    assert.deepEqual(plan.conflicts, []);
    const redirect = plan.operations.find(
      (operation) =>
        operation.kind === "frontmatter" &&
        operation.set?.previous_urls !== undefined,
    );
    assert.ok(redirect && redirect.kind === "frontmatter");
    assert.deepEqual(redirect.set?.previous_urls, ["/n/legacy/post"]);
    assert.equal(redirect.set?.redirect_from, undefined);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
