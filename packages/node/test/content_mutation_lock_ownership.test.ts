import assert from "node:assert/strict";
import { type ChildProcess, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  acquireContentLock,
  reclaimStaleLock,
  retryOnSharingViolation,
} from "../src/file_system_content_migration_helpers.js";
import { FileSystemContentMutation } from "../src/file_system_content_mutation.js";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const workerPath = path.join(
  packageRoot,
  "test",
  "fixtures",
  "mutation_worker.ts",
);

function lockPath(root: string): string {
  return path.join(root, ".riebeckite", "mutations", "lock");
}

function guardPath(root: string): string {
  return `${lockPath(root)}.reclaim`;
}

async function directory(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-ownership-"));
}

function startWorker(mode: string, root: string): ChildProcess {
  return spawn(process.execPath, ["--import", "tsx", workerPath, mode, root], {
    cwd: packageRoot,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function finished(child: ChildProcess): Promise<{
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
}> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function waitForReady(root: string): Promise<void> {
  const target = path.join(root, ".riebeckite", "worker-ready");
  const deadline = Date.now() + 15_000;
  for (;;) {
    try {
      await fs.access(target);
      return;
    } catch {
      if (Date.now() > deadline)
        throw new Error("The worker did not reach its blocking point.");
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
}

async function releaseWorker(root: string): Promise<void> {
  await fs.writeFile(
    path.join(root, ".riebeckite", "worker-release"),
    "release",
  );
}

async function readLock(file: string): Promise<Record<string, unknown>> {
  return JSON.parse(await fs.readFile(file, "utf8")) as Record<string, unknown>;
}

async function writeDeadLock(root: string): Promise<void> {
  await fs.mkdir(path.dirname(lockPath(root)), { recursive: true });
  await fs.writeFile(
    lockPath(root),
    JSON.stringify({
      pid: 2_147_483_647,
      token: "dead-owner",
      startedAt: new Date(0).toISOString(),
    }),
  );
}

async function crashJournal(
  root: string,
  id: string,
  filePath: string,
  before: string,
  after: string,
): Promise<string> {
  const digest = (value: string) =>
    createHash("sha256").update(value).digest("hex");
  const journalDirectory = path.join(root, ".riebeckite", "mutations", id);
  await fs.mkdir(path.join(journalDirectory, "backups"), { recursive: true });
  const backupPath = `backups/${Buffer.from(filePath).toString("base64url")}`;
  await fs.writeFile(path.join(journalDirectory, backupPath), before);
  const journal = path.join(journalDirectory, "journal.json");
  await fs.writeFile(
    journal,
    JSON.stringify({
      version: 1,
      id,
      state: "applying",
      changes: [
        {
          path: filePath,
          beforeFingerprint: digest(before),
          afterFingerprint: digest(after),
          backupPath,
          status: "applied",
        },
      ],
    }),
  );
  return journal;
}

test("a reclaimer that lost its guard preserves the new guard and lock", {
  timeout: 30_000,
}, async () => {
  const root = await directory();
  await writeDeadLock(root);
  const child = startWorker("reclaim-block", root);
  const exited = finished(child);
  try {
    await waitForReady(root);
    await fs.rm(guardPath(root), { force: true });
    await fs.writeFile(
      guardPath(root),
      JSON.stringify({ pid: process.pid, token: "new-guard" }),
    );
    await fs.writeFile(
      lockPath(root),
      JSON.stringify({ pid: process.pid, token: "new-lock" }),
    );
    await releaseWorker(root);
    const result = await exited;
    assert.equal(result.code, 0);
    assert.deepEqual(JSON.parse(result.stdout.trim()), { reclaimed: false });
    assert.equal((await readLock(guardPath(root))).token, "new-guard");
    assert.equal((await readLock(lockPath(root))).token, "new-lock");
  } finally {
    child.kill("SIGKILL");
    await exited;
  }
});

test("a reclaimer preserves a lock replaced before removal", async () => {
  const root = await directory();
  await writeDeadLock(root);
  const reclaimed = await reclaimStaleLock(lockPath(root), {
    beforeLockRemoval: async () => {
      await fs.writeFile(
        lockPath(root),
        JSON.stringify({ pid: process.pid, token: "new-owner" }),
      );
    },
  });
  assert.equal(reclaimed, false);
  assert.equal((await readLock(lockPath(root))).token, "new-owner");
  await assert.rejects(fs.access(guardPath(root)));
});

test("release preserves a lock replaced by another owner", async () => {
  const root = await directory();
  const lock = await acquireContentLock(
    lockPath(root),
    "The content lock is busy.",
  );
  await fs.writeFile(
    lockPath(root),
    JSON.stringify({ pid: process.pid, token: "new-owner" }),
  );
  await assert.rejects(lock.assertOwned(), /no longer owned/);
  await lock.release();
  assert.equal((await readLock(lockPath(root))).token, "new-owner");
});

test("a guard left by a killed reclaimer is reclaimed", {
  timeout: 30_000,
}, async () => {
  const root = await directory();
  await writeDeadLock(root);
  const child = startWorker("reclaim-block", root);
  const exited = finished(child);
  await waitForReady(root);
  child.kill("SIGKILL");
  await exited;
  assert.ok((await readLock(guardPath(root))).token);
  assert.equal(await reclaimStaleLock(lockPath(root)), true);
  await assert.rejects(fs.access(lockPath(root)));
  await assert.rejects(fs.access(guardPath(root)));
});

test("simultaneous stale reclaimers remove the lock once", async () => {
  const root = await directory();
  await writeDeadLock(root);
  const results = await Promise.all(
    Array.from({ length: 5 }, () => reclaimStaleLock(lockPath(root))),
  );
  assert.equal(results.filter(Boolean).length, 1);
  await assert.rejects(fs.access(lockPath(root)));
  await assert.rejects(fs.access(guardPath(root)));
});

test("apply stops when its lock is replaced before a write", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "note.md"), "before");
  const mutation = new FileSystemContentMutation(root, {
    beforeWrite: async () => {
      await fs.writeFile(
        lockPath(root),
        JSON.stringify({ pid: process.pid, token: "new-owner" }),
      );
    },
  });
  const plan = await mutation.plan([
    { kind: "update", path: "note.md", content: "after" },
  ]);
  await assert.rejects(mutation.apply(plan), /no longer owned/);
  assert.equal(await fs.readFile(path.join(root, "note.md"), "utf8"), "before");
  const journal = JSON.parse(
    await fs.readFile(
      path.join(root, ".riebeckite", "mutations", plan.id, "journal.json"),
      "utf8",
    ),
  ) as { state: string };
  assert.notEqual(journal.state, "complete");
  assert.equal((await readLock(lockPath(root))).token, "new-owner");
});

test("apply preserves a file replaced before a planned delete", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "note.md"), "before");
  const mutation = new FileSystemContentMutation(root, {
    beforeWrite: async () => {
      await fs.writeFile(path.join(root, "note.md"), "external");
    },
  });
  const plan = await mutation.plan([{ kind: "delete", path: "note.md" }]);
  await assert.rejects(mutation.apply(plan), /Content changed during apply/);
  assert.equal(
    await fs.readFile(path.join(root, "note.md"), "utf8"),
    "external",
  );
  const journal = JSON.parse(
    await fs.readFile(
      path.join(root, ".riebeckite", "mutations", plan.id, "journal.json"),
      "utf8",
    ),
  ) as { state: string };
  assert.equal(journal.state, "failed");
});

test("apply preserves a file created before a planned create", async () => {
  const root = await directory();
  const mutation = new FileSystemContentMutation(root, {
    beforeWrite: async () => {
      await fs.writeFile(path.join(root, "note.md"), "external");
    },
  });
  const plan = await mutation.plan([
    { kind: "create", path: "note.md", content: "after" },
  ]);
  await assert.rejects(mutation.apply(plan), /Content changed during apply/);
  assert.equal(
    await fs.readFile(path.join(root, "note.md"), "utf8"),
    "external",
  );
});

test("recovery can be repeated without restoring twice", async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "note.md"), "after");
  const journal = await crashJournal(
    root,
    "repeat",
    "note.md",
    "before",
    "after",
  );
  const mutation = new FileSystemContentMutation(root);
  const first = await mutation.recover(journal);
  assert.equal(first.recovered, true);
  assert.equal(await fs.readFile(path.join(root, "note.md"), "utf8"), "before");
  const second = await mutation.recover(journal);
  assert.equal(second.recovered, false);
  assert.deepEqual(second.restoredPaths, []);
  assert.equal(await fs.readFile(path.join(root, "note.md"), "utf8"), "before");
  const value = JSON.parse(await fs.readFile(journal, "utf8")) as {
    state: string;
  };
  assert.equal(value.state, "recovered");
});

test("sharing violations are retried with a bounded attempt count", async () => {
  let attempts = 0;
  const value = await retryOnSharingViolation(async () => {
    attempts += 1;
    if (attempts < 3) {
      const error = new Error("busy") as NodeJS.ErrnoException;
      error.code = "EPERM";
      throw error;
    }
    return "ok";
  });
  assert.equal(value, "ok");
  assert.equal(attempts, 3);

  attempts = 0;
  await assert.rejects(
    retryOnSharingViolation(async () => {
      attempts += 1;
      const error = new Error("busy") as NodeJS.ErrnoException;
      error.code = "EBUSY";
      throw error;
    }),
    /busy/,
  );
  assert.equal(attempts, 6);

  attempts = 0;
  await assert.rejects(
    retryOnSharingViolation(async () => {
      attempts += 1;
      const error = new Error("missing") as NodeJS.ErrnoException;
      error.code = "ENOENT";
      throw error;
    }),
    /missing/,
  );
  assert.equal(attempts, 1);
});
