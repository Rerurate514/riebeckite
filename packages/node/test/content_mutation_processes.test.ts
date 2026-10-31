import assert from "node:assert/strict";
import { type ChildProcess, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
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

type WorkerResult = {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly value?: Record<string, unknown>;
};

async function directory(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-process-"));
}

function startWorker(
  mode: string,
  root: string,
  argument: string,
): ChildProcess {
  return spawn(
    process.execPath,
    ["--import", "tsx", workerPath, mode, root, argument],
    { cwd: packageRoot, stdio: ["ignore", "pipe", "pipe"] },
  );
}

function finished(child: ChildProcess): Promise<WorkerResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("close", (code) => {
      let value: Record<string, unknown> | undefined;
      try {
        value = JSON.parse(stdout.trim()) as Record<string, unknown>;
      } catch {}
      resolve({ code, stdout, stderr, value });
    });
  });
}

async function runWorker(
  mode: string,
  root: string,
  argument: string,
): Promise<WorkerResult> {
  return await finished(startWorker(mode, root, argument));
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

test("only one of two simultaneous applies of the same plan succeeds", {
  timeout: 30_000,
}, async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "note.md"), "before");
  const mutation = new FileSystemContentMutation(root);
  const plan = await mutation.plan([
    { kind: "update", path: "note.md", content: "after" },
  ]);
  const planPath = await mutation.savePlan(plan, "concurrent.json");
  const results = await Promise.all([
    runWorker("apply", root, planPath),
    runWorker("apply", root, planPath),
  ]);
  const applied = results.filter((result) => result.value?.applied === true);
  assert.equal(applied.length, 1);
  assert.equal(await fs.readFile(path.join(root, "note.md"), "utf8"), "after");
});

test("only one of two simultaneous recoveries reports success", {
  timeout: 30_000,
}, async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "note.md"), "after");
  const journal = await crashJournal(
    root,
    "crash",
    "note.md",
    "before",
    "after",
  );
  const results = await Promise.all([
    runWorker("recover", root, journal),
    runWorker("recover", root, journal),
  ]);
  const recovered = results.filter(
    (result) => result.value?.recovered === true,
  );
  assert.equal(recovered.length, 1);
  assert.equal(await fs.readFile(path.join(root, "note.md"), "utf8"), "before");
  const value = JSON.parse(await fs.readFile(journal, "utf8"));
  assert.equal(value.state, "recovered");
});

test("refuses to apply while a live process owns the lock", {
  timeout: 30_000,
}, async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "note.md"), "before");
  const mutation = new FileSystemContentMutation(root);
  const plan = await mutation.plan([
    { kind: "update", path: "note.md", content: "after" },
  ]);
  const planPath = await mutation.savePlan(plan);
  const lock = path.join(root, ".riebeckite", "mutations", "lock");
  await fs.writeFile(
    lock,
    JSON.stringify({ pid: process.pid, token: "other-owner" }),
  );
  const result = await runWorker("apply", root, planPath);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /already applying/);
  assert.equal(await fs.readFile(path.join(root, "note.md"), "utf8"), "before");
});

test("reclaims the lock after its owner is killed", {
  timeout: 30_000,
}, async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "note.md"), "before");
  const mutation = new FileSystemContentMutation(root);
  const plan = await mutation.plan([
    { kind: "update", path: "note.md", content: "after" },
  ]);
  const planPath = await mutation.savePlan(plan);
  const child = startWorker("apply-block", root, planPath);
  const exited = finished(child);
  await waitForReady(root);
  child.kill("SIGKILL");
  await exited;
  const result = await runWorker("apply", root, planPath);
  assert.equal(result.value?.applied, true);
  assert.equal(await fs.readFile(path.join(root, "note.md"), "utf8"), "after");
});

test("stale lock reclamation racing with another apply never applies twice", {
  timeout: 30_000,
}, async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "note.md"), "before");
  const mutation = new FileSystemContentMutation(root);
  const plan = await mutation.plan([
    { kind: "update", path: "note.md", content: "after" },
  ]);
  const planPath = await mutation.savePlan(plan);
  await fs.mkdir(path.join(root, ".riebeckite", "mutations"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(root, ".riebeckite", "mutations", "lock"),
    JSON.stringify({
      pid: 2_147_483_647,
      token: "dead-owner",
      startedAt: new Date(0).toISOString(),
    }),
  );
  const results = await Promise.all([
    runWorker("apply", root, planPath),
    runWorker("apply", root, planPath),
    runWorker("apply", root, planPath),
  ]);
  const applied = results.filter((result) => result.value?.applied === true);
  assert.equal(applied.length, 1);
  assert.equal(await fs.readFile(path.join(root, "note.md"), "utf8"), "after");
});

test("apply and recovery serialize without corrupting either file", {
  timeout: 40_000,
}, async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "a.md"), "a0");
  await fs.writeFile(path.join(root, "b.md"), "b1");
  const mutation = new FileSystemContentMutation(root);
  const plan = await mutation.plan([
    { kind: "update", path: "a.md", content: "a1" },
  ]);
  const planPath = await mutation.savePlan(plan);
  const journal = await crashJournal(root, "crash", "b.md", "b0", "b1");
  const first = await Promise.all([
    runWorker("apply", root, planPath),
    runWorker("recover", root, journal),
  ]);
  for (const [index, mode] of ["apply", "recover"].entries()) {
    if (first[index]?.code !== 0) {
      const argument = mode === "apply" ? planPath : journal;
      const retried = await runWorker(mode, root, argument);
      assert.equal(retried.code, 0);
    }
  }
  assert.equal(await fs.readFile(path.join(root, "a.md"), "utf8"), "a1");
  assert.equal(await fs.readFile(path.join(root, "b.md"), "utf8"), "b0");
});

test("recovers after a process is killed during recovery", {
  timeout: 40_000,
}, async () => {
  const root = await directory();
  await fs.writeFile(path.join(root, "a.md"), "a1");
  await fs.writeFile(path.join(root, "b.md"), "b1");
  const journal = await crashJournal(root, "crash", "a.md", "a0", "a1");
  const second = await crashJournal(root, "crash2", "b.md", "b0", "b1");
  const child = startWorker("recover-block", root, journal);
  const exited = finished(child);
  await waitForReady(root);
  child.kill("SIGKILL");
  await exited;
  await fs.rm(path.join(root, ".riebeckite", "worker-ready"), {
    force: true,
  });
  const result = await runWorker("recover", root, journal);
  assert.equal(result.value?.recovered, true);
  assert.equal(await fs.readFile(path.join(root, "a.md"), "utf8"), "a0");
  const other = await new FileSystemContentMutation(root).recover(second);
  assert.equal(other.recovered, true);
  assert.equal(await fs.readFile(path.join(root, "b.md"), "utf8"), "b0");
});

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
