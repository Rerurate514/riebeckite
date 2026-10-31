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
