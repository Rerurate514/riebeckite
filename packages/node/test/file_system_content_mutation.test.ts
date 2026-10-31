import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { FileSystemContentMutation } from "../src/file_system_content_mutation.js";

async function directory(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-mutation-"));
}

test("plans without writing and applies a batch including Markdown frontmatter", async () => {
  const root = await directory();
  await fs.writeFile(
    path.join(root, "note.md"),
    "---\ntitle: Old\nmeta:\n  keep: yes\n---\n# Note\n",
  );
  const mutation = new FileSystemContentMutation(root);
  const plan = await mutation.plan([
    {
      kind: "batch",
      operations: [
        {
          kind: "frontmatter",
          path: "note.md",
          set: { title: "New", "meta.added": true },
        },
        { kind: "rename", from: "note.md", to: "notes/new.md" },
        {
          kind: "asset-create",
          path: "assets/a.bin",
          content: new Uint8Array([1, 2]),
        },
      ],
    },
  ]);

  assert.equal(
    await fs.readFile(path.join(root, "note.md"), "utf8"),
    "---\ntitle: Old\nmeta:\n  keep: yes\n---\n# Note\n",
  );
  assert.deepEqual(plan.conflicts, []);
  const result = await mutation.apply(plan);
  assert.equal(result.applied, true);
  assert.match(
    await fs.readFile(path.join(root, "notes", "new.md"), "utf8"),
    /title: New/,
  );
  assert.deepEqual(
    await fs.readFile(path.join(root, "assets", "a.bin")),
    Buffer.from([1, 2]),
  );
  await assert.rejects(() => fs.readFile(path.join(root, "note.md")));
});

test("rejects a changed file before applying", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "note.md"), "first");
  const mutation = new FileSystemContentMutation(root);
  const plan = await mutation.plan([
    { kind: "update", path: "note.md", content: "planned" },
  ]);
  await fs.writeFile(path.join(root, "note.md"), "concurrent");
  const result = await mutation.apply(plan);
  assert.equal(result.applied, false);
  assert.equal(result.conflicts[0]?.code, "concurrent-modification");
  assert.equal(
    await fs.readFile(path.join(root, "note.md"), "utf8"),
    "concurrent",
  );
});

test("persists a plan, revalidates it, and refuses a duplicate apply", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "note.md"), "first");
  const mutation = new FileSystemContentMutation(root);
  const plan = await mutation.plan([
    { kind: "update", path: "note.md", content: "planned" },
  ]);
  const planPath = await mutation.savePlan(plan, "note-update.json");
  const restored = await mutation.loadPlan(planPath);
  assert.deepEqual(
    restored.changes.map(({ content, ...change }) => ({
      ...change,
      content: content && Buffer.from(content).toString("base64"),
    })),
    plan.changes.map(({ content, ...change }) => ({
      ...change,
      content: content && Buffer.from(content).toString("base64"),
    })),
  );
  assert.equal((await mutation.apply(restored)).applied, true);
  const duplicate = await mutation.apply(restored);
  assert.equal(duplicate.applied, false);
  assert.equal(duplicate.conflicts[0]?.code, "concurrent-modification");
});

test("rejects a persisted plan after its source changes", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "note.md"), "first");
  const mutation = new FileSystemContentMutation(root);
  const plan = await mutation.plan([
    { kind: "update", path: "note.md", content: "planned" },
  ]);
  const planPath = await mutation.savePlan(plan);
  await fs.writeFile(path.join(root, "note.md"), "concurrent");
  const result = await mutation.apply(await mutation.loadPlan(planPath));
  assert.equal(result.applied, false);
  assert.equal(result.conflicts[0]?.code, "concurrent-modification");
});

test("releases a lock owned by a dead process", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "note.md"), "first");
  const mutation = new FileSystemContentMutation(root);
  const plan = await mutation.plan([
    { kind: "update", path: "note.md", content: "planned" },
  ]);
  const mutationRoot = path.join(root, ".riebeckite", "mutations");
  await fs.mkdir(mutationRoot, { recursive: true });
  await fs.writeFile(
    path.join(mutationRoot, "lock"),
    JSON.stringify({ pid: 2_147_483_647 }),
  );
  assert.equal((await mutation.apply(plan)).applied, true);
});

test("recovers only files whose applied fingerprint still matches", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "note.md"), "original");
  const mutation = new FileSystemContentMutation(root, {
    beforeWrite: (filePath) => {
      if (filePath === "note.md") throw new Error("injected failure");
    },
  });
  const plan = await mutation.plan([
    { kind: "rename", from: "note.md", to: "new.md" },
  ]);
  await assert.rejects(() => mutation.apply(plan), /injected failure/);
  const journal = path.join(
    root,
    ".riebeckite",
    "mutations",
    plan.id,
    "journal.json",
  );
  const recovered = await new FileSystemContentMutation(root).recover(journal);
  assert.equal(recovered.recovered, true);
  assert.equal(
    await fs.readFile(path.join(root, "note.md"), "utf8"),
    "original",
  );
  await assert.rejects(() => fs.readFile(path.join(root, "new.md")));
});

test("refuses traversal and symbolic-link write paths", async (t) => {
  const root = await directory();
  const mutation = new FileSystemContentMutation(root);
  const traversal = await mutation.plan([
    { kind: "create", path: "../outside.md", content: "no" },
  ]);
  assert.equal(traversal.conflicts[0]?.code, "invalid-operation");
  const outside = await directory();
  try {
    await fs.symlink(outside, path.join(root, "linked"), "dir");
  } catch (error) {
    t.diagnostic(`Skipping symlink assertion: ${String(error)}`);
    return;
  }
  const symlink = await mutation.plan([
    { kind: "create", path: "linked/outside.md", content: "no" },
  ]);
  const result = await mutation.apply(symlink);
  assert.equal(result.applied, false);
});

test("rewrites references when content moves and warns on deletion", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "target.md"), "# Target");
  await fs.writeFile(
    path.join(root, "source.md"),
    "See [[target]] and [t](target.md).",
  );
  const mutation = new FileSystemContentMutation(root);
  const plan = await mutation.plan([
    { kind: "move", from: "target.md", to: "moved/target.md" },
  ]);
  assert.deepEqual(plan.conflicts, []);
  const result = await mutation.apply(plan);
  assert.equal(result.applied, true);
  assert.equal(
    await fs.readFile(path.join(root, "source.md"), "utf8"),
    "See [[moved/target]] and [t](moved/target.md).",
  );
  const deletion = await mutation.plan([
    { kind: "delete", path: "moved/target.md" },
  ]);
  assert.equal(deletion.warnings[0]?.code, "broken-link");
  assert.deepEqual(deletion.conflicts, []);
});

test("uses content aliases when deciding which links to rewrite", async () => {
  const root = await directory();
  await fs.writeFile(
    path.join(root, "target.md"),
    "---\naliases:\n  - nickname\n---\n# Target",
  );
  await fs.writeFile(path.join(root, "source.md"), "[[nickname]]");
  const mutation = new FileSystemContentMutation(root);
  const deletion = await mutation.plan([{ kind: "delete", path: "target.md" }]);
  assert.equal(deletion.warnings[0]?.code, "broken-link");

  await fs.writeFile(
    path.join(root, "archive.md"),
    "---\nalias: target\n---\n",
  );
  await fs.writeFile(path.join(root, "other.md"), "[[target]]");
  const move = await mutation.plan([
    { kind: "move", from: "target.md", to: "moved/target.md" },
  ]);
  assert.equal(move.warnings.length, 0);
  assert.deepEqual(move.conflicts, []);
  assert.equal(
    move.changes.some((change) => change.path === "other.md"),
    false,
  );
});
