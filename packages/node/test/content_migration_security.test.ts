import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  ContentMigrationRegistryError,
  createContentMigrationRegistry,
  defineContentMigration,
} from "@riebeckite/core";
import { FileSystemContentMigration } from "../index.js";

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-secure-"));
  await fs.writeFile(
    path.join(root, "post.md"),
    "---\nid: post\ntitle: Post\ncategory: programming\npublished: true\n---\nSECRET BODY\n",
  );
  const definition = defineContentMigration({
    id: "legacy",
    version: 1,
    description: "Convert legacy fields.",
    rules: [
      { kind: "frontmatter-map", key: "category", map: (value) => [value] },
      { kind: "frontmatter-rename", from: "category", to: "tags" },
      { kind: "frontmatter-remove", key: "published" },
    ],
  });
  const registry = createContentMigrationRegistry([definition]);
  return {
    root,
    registry,
    migration: (next = registry) =>
      new FileSystemContentMigration({
        contentDirectory: root,
        registry: next,
      }),
  };
}

test("concurrent applies apply once and reject the other", async () => {
  const { root, migration } = await fixture();
  try {
    const instance = migration();
    const results = await Promise.all([instance.apply(), instance.apply()]);
    assert.equal(results.filter((result) => result.applied).length, 1);
    assert.equal(
      results.filter((result) =>
        result.conflicts.some(
          (conflict) => conflict.code === "migration-locked",
        ),
      ).length,
      1,
    );
    assert.equal((await instance.history()).runs.length, 1);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("rejects tampered plans, fingerprints, versions and operation paths", async () => {
  const { root, migration } = await fixture();
  try {
    const instance = migration();
    const plan = await instance.plan();
    const saved = await instance.savePlan(plan);
    const original = JSON.parse(await fs.readFile(saved, "utf8"));

    for (const mutate of [
      (value: Record<string, unknown>) => {
        value.planFingerprint = "0".repeat(64);
      },
      (value: Record<string, unknown>) => {
        const migrations = value.migrations as { version: number }[];
        const first = migrations[0];
        if (first) first.version = 99;
      },
      (value: Record<string, unknown>) => {
        value.operations = [
          { kind: "create", path: "../escape.md", content: "escaped" },
        ];
      },
    ]) {
      const copy = structuredClone(original);
      mutate(copy);
      await fs.writeFile(saved, JSON.stringify(copy));
      const result = await instance.apply({ planPath: saved });
      assert.equal(result.applied, false);
      assert.ok(
        result.conflicts.some((conflict) => conflict.code === "stale-plan"),
      );
    }
    await assert.rejects(() => fs.access(path.join(root, "..", "escape.md")));
    assert.equal(
      (await fs.readFile(path.join(root, "post.md"), "utf8")).includes(
        "category: programming",
      ),
      true,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("rejects path traversal in migration definitions", () => {
  assert.throws(
    () =>
      createContentMigrationRegistry([
        defineContentMigration({
          id: "escape",
          version: 1,
          description: "Escape the content root.",
          rules: [{ kind: "path-rename", from: "post.md", to: "../escape.md" }],
        }),
      ]),
    ContentMigrationRegistryError,
  );
});

test("does not follow symlinked content", async (context) => {
  const { root, migration } = await fixture();
  const outside = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-outside-"),
  );
  try {
    await fs.writeFile(path.join(outside, "secret.md"), "SECRET\n");
    try {
      await fs.symlink(
        path.join(outside, "secret.md"),
        path.join(root, "link.md"),
      );
    } catch {
      context.skip("Symlinks are not available on this platform.");
      return;
    }
    const plan = await migration().plan();
    assert.equal(
      plan.changes.some((change) => change.path === "link.md"),
      false,
    );
    assert.equal(
      plan.selections.some((selection) => selection.paths.includes("link.md")),
      false,
    );
    assert.equal(
      await fs.readFile(path.join(outside, "secret.md"), "utf8"),
      "SECRET\n",
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(outside, { recursive: true, force: true });
  }
});

test("a stale migration lock blocks apply without writing", async () => {
  const { root, migration } = await fixture();
  try {
    const lock = path.join(root, ".riebeckite", "migrations", "lock");
    await fs.mkdir(path.dirname(lock), { recursive: true });
    await fs.writeFile(lock, JSON.stringify({ pid: process.pid }));
    const result = await migration().apply();
    assert.equal(result.applied, false);
    assert.ok(
      result.conflicts.some((conflict) => conflict.code === "migration-locked"),
    );
    assert.match(
      await fs.readFile(path.join(root, "post.md"), "utf8"),
      /category: programming/,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("rejects a journal outside the content directory", async () => {
  const { root, migration } = await fixture();
  try {
    await assert.rejects(
      () => migration().recover({ journal: "../../escape/journal.json" }),
      /outside the content directory/,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
