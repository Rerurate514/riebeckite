import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { FileSystemContentMutation } from "../src/file_system_content_mutation.js";

async function directory(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-mutation-"));
}

type CrashChange = {
  readonly path: string;
  readonly before: string | null;
  readonly after: string | null;
  readonly status?: "pending" | "applied";
};

async function writeCrashJournal(
  root: string,
  id: string,
  changes: readonly CrashChange[],
): Promise<string> {
  const journalDirectory = path.join(root, ".riebeckite", "mutations", id);
  await fs.mkdir(path.join(journalDirectory, "backups"), { recursive: true });
  const entries = [];
  for (const change of changes) {
    let backupPath: string | undefined;
    if (change.before !== null) {
      backupPath = `backups/${Buffer.from(change.path).toString("base64url")}`;
      await fs.writeFile(
        path.join(journalDirectory, backupPath),
        change.before,
      );
    }
    entries.push({
      path: change.path,
      beforeFingerprint:
        change.before === null
          ? null
          : createHash("sha256").update(change.before).digest("hex"),
      afterFingerprint:
        change.after === null
          ? null
          : createHash("sha256").update(change.after).digest("hex"),
      backupPath,
      status: change.status ?? "pending",
    });
  }
  const journalPath = path.join(journalDirectory, "journal.json");
  await fs.writeFile(
    journalPath,
    JSON.stringify({
      version: 1,
      id,
      state: "applying",
      changes: entries,
    }),
  );
  return journalPath;
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

test("refuses a changed file before applying", async () => {
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

test("refuses to overwrite a file changed after its backup", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "note.md"), "first");
  const mutation = new FileSystemContentMutation(root, {
    beforeWrite: async (filePath) => {
      if (filePath === "note.md")
        await fs.writeFile(path.join(root, filePath), "external");
    },
  });
  const plan = await mutation.plan([
    { kind: "update", path: "note.md", content: "planned" },
  ]);
  await assert.rejects(() => mutation.apply(plan), /changed during apply/);
  assert.equal(
    await fs.readFile(path.join(root, "note.md"), "utf8"),
    "external",
  );
});

test("refuses to overwrite a file created after backup", async () => {
  const root = await directory();
  const mutation = new FileSystemContentMutation(root, {
    beforeWrite: async (filePath) => {
      if (filePath === "note.md")
        await fs.writeFile(path.join(root, filePath), "external");
    },
  });
  const plan = await mutation.plan([
    { kind: "create", path: "note.md", content: "planned" },
  ]);
  await assert.rejects(() => mutation.apply(plan), /changed during apply/);
  assert.equal(
    await fs.readFile(path.join(root, "note.md"), "utf8"),
    "external",
  );
});

test("refuses to delete a file changed after its backup", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "note.md"), "first");
  const mutation = new FileSystemContentMutation(root, {
    beforeWrite: async (filePath) => {
      if (filePath === "note.md")
        await fs.writeFile(path.join(root, filePath), "external");
    },
  });
  const plan = await mutation.plan([{ kind: "delete", path: "note.md" }]);
  await assert.rejects(() => mutation.apply(plan), /changed during apply/);
  assert.equal(
    await fs.readFile(path.join(root, "note.md"), "utf8"),
    "external",
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

test("refuses a lock owned by a live process", async () => {
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
    JSON.stringify({ pid: process.pid }),
  );
  await assert.rejects(() => mutation.apply(plan), /already applying/);
  assert.equal(await fs.readFile(path.join(root, "note.md"), "utf8"), "first");
});

test("reclaims an unreadable lock after a grace period", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "note.md"), "first");
  const mutation = new FileSystemContentMutation(root);
  const plan = await mutation.plan([
    { kind: "update", path: "note.md", content: "planned" },
  ]);
  const mutationRoot = path.join(root, ".riebeckite", "mutations");
  await fs.mkdir(mutationRoot, { recursive: true });
  const lockPath = path.join(mutationRoot, "lock");
  await fs.writeFile(lockPath, "");
  const old = new Date(Date.now() - 10_000);
  await fs.utimes(lockPath, old, old);
  assert.equal((await mutation.apply(plan)).applied, true);
});

test("does not reclaim a newly created empty lock", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "note.md"), "first");
  const mutation = new FileSystemContentMutation(root);
  const plan = await mutation.plan([
    { kind: "update", path: "note.md", content: "planned" },
  ]);
  const mutationRoot = path.join(root, ".riebeckite", "mutations");
  await fs.mkdir(mutationRoot, { recursive: true });
  await fs.writeFile(path.join(mutationRoot, "lock"), "");
  await assert.rejects(() => mutation.apply(plan), /already applying/);
  assert.equal(await fs.readFile(path.join(root, "note.md"), "utf8"), "first");
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

test("recovery rolls back a write whose journal mark was lost", async () => {
  const root = await directory();
  const before = "original";
  const after = "applied";
  await fs.writeFile(path.join(root, "note.md"), after);
  const mutationRoot = path.join(root, ".riebeckite", "mutations", "crash");
  await fs.mkdir(path.join(mutationRoot, "backups"), { recursive: true });
  const backupPath = `backups/${Buffer.from("note.md").toString("base64url")}`;
  await fs.writeFile(path.join(mutationRoot, backupPath), before);
  const journalPath = path.join(mutationRoot, "journal.json");
  await fs.writeFile(
    journalPath,
    JSON.stringify({
      version: 1,
      id: "crash",
      state: "applying",
      changes: [
        {
          path: "note.md",
          beforeFingerprint: createHash("sha256").update(before).digest("hex"),
          afterFingerprint: createHash("sha256").update(after).digest("hex"),
          backupPath,
          status: "pending",
        },
      ],
    }),
  );
  const recovered = await new FileSystemContentMutation(root).recover(
    journalPath,
  );
  assert.equal(recovered.recovered, true);
  assert.deepEqual(recovered.restoredPaths, ["note.md"]);
  assert.equal(await fs.readFile(path.join(root, "note.md"), "utf8"), before);
});

test("reports a recovery conflict when a file changed after the crash", async () => {
  const root = await directory();
  const before = "original";
  const after = "applied";
  await fs.writeFile(path.join(root, "note.md"), "third");
  const mutationRoot = path.join(root, ".riebeckite", "mutations", "crash");
  await fs.mkdir(path.join(mutationRoot, "backups"), { recursive: true });
  const backupPath = `backups/${Buffer.from("note.md").toString("base64url")}`;
  await fs.writeFile(path.join(mutationRoot, backupPath), before);
  const journalPath = path.join(mutationRoot, "journal.json");
  await fs.writeFile(
    journalPath,
    JSON.stringify({
      version: 1,
      id: "crash",
      state: "applying",
      changes: [
        {
          path: "note.md",
          beforeFingerprint: createHash("sha256").update(before).digest("hex"),
          afterFingerprint: createHash("sha256").update(after).digest("hex"),
          backupPath,
          status: "applied",
        },
      ],
    }),
  );
  const recovered = await new FileSystemContentMutation(root).recover(
    journalPath,
  );
  assert.equal(recovered.recovered, false);
  assert.equal(recovered.conflicts[0]?.code, "recovery-conflict");
  assert.equal(await fs.readFile(path.join(root, "note.md"), "utf8"), "third");
});

test("does not overwrite an external edit made before recovery capture", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "a.md"), "a0");
  await fs.writeFile(path.join(root, "b.md"), "b0");
  let writes = 0;
  const mutation = new FileSystemContentMutation(root, {
    beforeWrite: () => {
      writes += 1;
      if (writes === 2) throw new Error("injected failure");
    },
  });
  const plan = await mutation.plan([
    { kind: "update", path: "a.md", content: "a1" },
    { kind: "update", path: "b.md", content: "b1" },
  ]);
  await assert.rejects(() => mutation.apply(plan), /injected failure/);
  const journal = path.join(
    root,
    ".riebeckite",
    "mutations",
    plan.id,
    "journal.json",
  );
  const recovered = await new FileSystemContentMutation(root, {
    beforeRecoveryRestore: async (filePath) => {
      if (filePath === "a.md")
        await fs.writeFile(path.join(root, filePath), "external");
    },
  }).recover(journal);
  assert.equal(recovered.recovered, false);
  assert.equal(recovered.conflicts[0]?.code, "recovery-conflict");
  assert.equal(await fs.readFile(path.join(root, "a.md"), "utf8"), "external");
  assert.equal(await fs.readFile(path.join(root, "b.md"), "utf8"), "b0");
  const journalValue = JSON.parse(await fs.readFile(journal, "utf8"));
  assert.equal(journalValue.state, "failed");
  assert.equal(
    await fs.readFile(
      path.join(
        path.dirname(journal),
        "backups",
        Buffer.from("a.md").toString("base64url"),
      ),
      "utf8",
    ),
    "a0",
  );
});

test("does not delete a file created during recovery", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "z.md"), "z0");
  let writes = 0;
  const mutation = new FileSystemContentMutation(root, {
    beforeWrite: () => {
      writes += 1;
      if (writes === 2) throw new Error("injected failure");
    },
  });
  const plan = await mutation.plan([
    { kind: "create", path: "a.md", content: "created" },
    { kind: "update", path: "z.md", content: "z1" },
  ]);
  await assert.rejects(() => mutation.apply(plan), /injected failure/);
  const journal = path.join(
    root,
    ".riebeckite",
    "mutations",
    plan.id,
    "journal.json",
  );
  const recovered = await new FileSystemContentMutation(root, {
    afterRecoveryCapture: async (filePath) => {
      if (filePath === "a.md")
        await fs.writeFile(path.join(root, filePath), "external");
    },
  }).recover(journal);
  assert.equal(recovered.recovered, false);
  assert.equal(recovered.conflicts[0]?.code, "recovery-conflict");
  assert.equal(await fs.readFile(path.join(root, "a.md"), "utf8"), "external");
});

test("validates every backup before restoring any file", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "a.md"), "a1");
  await fs.writeFile(path.join(root, "b.md"), "b1");
  const journal = await writeCrashJournal(root, "crash", [
    { path: "a.md", before: "a0", after: "a1", status: "applied" },
    { path: "b.md", before: "b0", after: "b1", status: "applied" },
  ]);
  await fs.writeFile(
    path.join(
      path.dirname(journal),
      "backups",
      Buffer.from("a.md").toString("base64url"),
    ),
    "corrupt",
  );
  const recovered = await new FileSystemContentMutation(root).recover(journal);
  assert.equal(recovered.recovered, false);
  assert.equal(recovered.conflicts[0]?.code, "recovery-backup-invalid");
  assert.equal(await fs.readFile(path.join(root, "a.md"), "utf8"), "a1");
  assert.equal(await fs.readFile(path.join(root, "b.md"), "utf8"), "b1");
});

test("resumes recovery after restoring only some files", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "a.md"), "a1");
  await fs.writeFile(path.join(root, "b.md"), "b1");
  const journal = await writeCrashJournal(root, "crash", [
    { path: "a.md", before: "a0", after: "a1", status: "applied" },
    { path: "b.md", before: "b0", after: "b1", status: "applied" },
  ]);
  await assert.rejects(
    () =>
      new FileSystemContentMutation(root, {
        beforeRecoveryRestore: (filePath) => {
          if (filePath === "b.md") throw new Error("injected failure");
        },
      }).recover(journal),
    /injected failure/,
  );
  assert.equal(await fs.readFile(path.join(root, "a.md"), "utf8"), "a0");
  assert.equal(await fs.readFile(path.join(root, "b.md"), "utf8"), "b1");
  const recovered = await new FileSystemContentMutation(root).recover(journal);
  assert.equal(recovered.recovered, true);
  assert.deepEqual(recovered.restoredPaths, ["b.md"]);
  assert.equal(await fs.readFile(path.join(root, "b.md"), "utf8"), "b0");
});

test("rejects a journal outside a mutation directory", async () => {
  const root = await directory();
  const nested = path.join(root, ".riebeckite", "mutations", "plans");
  await fs.mkdir(nested, { recursive: true });
  const journal = path.join(nested, "journal.json");
  await fs.writeFile(
    journal,
    JSON.stringify({ version: 1, id: "plans", state: "failed", changes: [] }),
  );
  await assert.rejects(
    () => new FileSystemContentMutation(root).recover(journal),
    /does not belong/,
  );
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

test("rejects trailing dots and spaces in path components", async () => {
  const root = await directory();
  const mutation = new FileSystemContentMutation(root);
  for (const filePath of ["note.", "notes /note.md"]) {
    const plan = await mutation.plan([
      { kind: "create", path: filePath, content: "no" },
    ]);
    assert.equal(plan.conflicts[0]?.code, "invalid-operation");
  }
});

test("rejects frontmatter updates on invalid UTF-8 Markdown", async () => {
  const root = await directory();
  const original = Buffer.concat([
    Buffer.from("---\ntitle: Old\n---\n# Note\n"),
    Buffer.from([0xff]),
  ]);
  await fs.writeFile(path.join(root, "note.md"), original);
  const mutation = new FileSystemContentMutation(root);
  const plan = await mutation.plan([
    { kind: "frontmatter", path: "note.md", set: { title: "New" } },
  ]);
  assert.equal(plan.conflicts[0]?.code, "invalid-operation");
  assert.match(plan.conflicts[0]?.message ?? "", /not valid UTF-8/);
  assert.equal((await mutation.apply(plan)).applied, false);
  assert.deepEqual(await fs.readFile(path.join(root, "note.md")), original);
});

test("preserves a UTF-8 BOM when rewriting links", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "target.md"), "# Target");
  await fs.writeFile(path.join(root, "source.md"), "\uFEFF[target](target.md)");
  const mutation = new FileSystemContentMutation(root);
  const plan = await mutation.plan([
    { kind: "move", from: "target.md", to: "moved.md" },
  ]);
  assert.deepEqual(plan.conflicts, []);
  assert.equal((await mutation.apply(plan)).applied, true);
  assert.equal(
    await fs.readFile(path.join(root, "source.md"), "utf8"),
    "\uFEFF[target](moved.md)",
  );
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

test("rewrites relative links inside moved content", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "target.md"), "# Target");
  await fs.writeFile(
    path.join(root, "source.md"),
    "[target](target.md) [[target]]",
  );
  const plan = await new FileSystemContentMutation(root).plan([
    { kind: "move", from: "source.md", to: "nested/source.md" },
  ]);
  assert.deepEqual(plan.conflicts, []);
  const result = await new FileSystemContentMutation(root).apply(plan);
  assert.equal(result.applied, true);
  assert.equal(
    await fs.readFile(path.join(root, "nested", "source.md"), "utf8"),
    "[target](../target.md) [[target]]",
  );
});

test("folds chained moves to the final destination", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "a.md"), "# A");
  await fs.writeFile(path.join(root, "source.md"), "[[a]]");
  const mutation = new FileSystemContentMutation(root);
  const plan = await mutation.plan([
    { kind: "rename", from: "a.md", to: "b.md" },
    { kind: "rename", from: "b.md", to: "c.md" },
  ]);
  assert.deepEqual(plan.conflicts, []);
  assert.equal((await mutation.apply(plan)).applied, true);
  assert.equal(
    await fs.readFile(path.join(root, "source.md"), "utf8"),
    "[[c]]",
  );
});

test("keeps image destinations when a surrounding link moves", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "target.md"), "# Target");
  await fs.writeFile(path.join(root, "img.png"), "image");
  await fs.writeFile(
    path.join(root, "source.md"),
    "[![alt](img.png)](target.md)",
  );
  const mutation = new FileSystemContentMutation(root);
  const plan = await mutation.plan([
    { kind: "move", from: "target.md", to: "moved.md" },
  ]);
  assert.deepEqual(plan.conflicts, []);
  assert.equal((await mutation.apply(plan)).applied, true);
  assert.equal(
    await fs.readFile(path.join(root, "source.md"), "utf8"),
    "[![alt](img.png)](moved.md)",
  );
});

test("rewrites encoded links and uppercase Markdown extensions", async () => {
  const root = await directory();
  await fs.mkdir(path.join(root, "docs"));
  await fs.writeFile(path.join(root, "docs", "a b.md"), "# Space");
  await fs.writeFile(path.join(root, "source.md"), "[x](docs/a%20b.md)");
  const mutation = new FileSystemContentMutation(root);
  const encoded = await mutation.plan([
    { kind: "move", from: "docs/a b.md", to: "docs/c.md" },
  ]);
  assert.deepEqual(encoded.conflicts, []);
  assert.equal((await mutation.apply(encoded)).applied, true);
  assert.equal(
    await fs.readFile(path.join(root, "source.md"), "utf8"),
    "[x](docs/c.md)",
  );

  await fs.writeFile(path.join(root, "DRAFT.MD"), "# Draft");
  await fs.writeFile(path.join(root, "wiki.md"), "[[draft]]");
  const uppercase = await mutation.plan([
    { kind: "move", from: "DRAFT.MD", to: "final.md" },
  ]);
  assert.deepEqual(uppercase.conflicts, []);
  assert.equal((await mutation.apply(uppercase)).applied, true);
  assert.equal(
    await fs.readFile(path.join(root, "wiki.md"), "utf8"),
    "[[final]]",
  );
});

test("does not warn when a deleted path is recreated in the same plan", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "a.md"), "# Old");
  await fs.writeFile(path.join(root, "source.md"), "[[a]]");
  const plan = await new FileSystemContentMutation(root).plan([
    { kind: "delete", path: "a.md" },
    { kind: "create", path: "a.md", content: "# New" },
  ]);
  assert.deepEqual(plan.conflicts, []);
  assert.deepEqual(plan.warnings, []);
});

test("refuses a creation that makes existing links ambiguous", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "note.md"), "# Note");
  await fs.writeFile(path.join(root, "source.md"), "[[note]]");
  const plan = await new FileSystemContentMutation(root).plan([
    { kind: "create", path: "other/note.md", content: "# Other" },
  ]);
  assert.equal(plan.conflicts[0]?.code, "link-broken");
});
