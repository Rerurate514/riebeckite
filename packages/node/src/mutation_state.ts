import fs from "node:fs/promises";
import path from "node:path";
import type {
  ContentMutationFileChange,
  ContentMutationIssue,
  ContentMutationPlan,
} from "@riebeckite/core";
import {
  acquireContentLock,
  type ContentLock,
} from "./file_system_content_migration_helpers.js";
import type { FileState, MutationContext } from "./mutation_context.js";
import { readState, stateOf } from "./mutation_files.js";
import {
  type JournalChange,
  parsePlan,
  serializePlan,
} from "./mutation_journal.js";
import { writeFileAtomically, writeJsonAtomically } from "./mutation_writes.js";

export async function savePlan(
  m: MutationContext,
  plan: ContentMutationPlan,
  planPath?: string,
): Promise<string> {
  const root = await m.root();
  const target = await m.planPath(root, plan.id, planPath);
  await writeJsonAtomically(target, serializePlan(plan));
  return target;
}

export async function loadPlan(
  m: MutationContext,
  planPath: string,
): Promise<ContentMutationPlan> {
  const root = await m.root();
  const absolute = await m.planPath(root, undefined, planPath);
  return parsePlan(await fs.readFile(absolute, "utf8"));
}

export async function root(m: MutationContext): Promise<string> {
  const root = await fs.realpath(m.contentDirectory);
  if (!(await fs.stat(root)).isDirectory())
    throw new Error("Content directory is not a directory.");
  return root;
}

export async function loadFiles(
  m: MutationContext,
  root: string,
  relative: string,
  files: Map<string, FileState>,
): Promise<void> {
  for (const entry of await fs.readdir(path.join(root, relative), {
    withFileTypes: true,
  })) {
    if (entry.name === ".riebeckite" && relative === "") continue;
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) await m.loadFiles(root, child, files);
    if (entry.isFile())
      files.set(child, stateOf(await fs.readFile(path.join(root, child))));
  }
}

export async function verifyPreconditions(
  _m: MutationContext,
  root: string,
  changes: readonly ContentMutationFileChange[],
): Promise<ContentMutationIssue[]> {
  const conflicts: ContentMutationIssue[] = [];
  for (const change of changes) {
    try {
      const current = await readState(root, change.path);
      if ((current?.fingerprint ?? null) !== change.beforeFingerprint)
        conflicts.push({
          severity: "error",
          code: "concurrent-modification",
          path: change.path,
          message: "The file no longer matches the planned fingerprint.",
        });
    } catch (error) {
      conflicts.push({
        severity: "error",
        code: "unsafe-path",
        path: change.path,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return conflicts;
}

export async function backup(
  _m: MutationContext,
  root: string,
  journalDirectory: string,
  change: ContentMutationFileChange,
): Promise<JournalChange> {
  if (change.beforeFingerprint === null)
    return {
      path: change.path,
      beforeFingerprint: null,
      afterFingerprint: change.afterFingerprint,
      status: "pending",
    };
  const state = await readState(root, change.path);
  if (!state || state.fingerprint !== change.beforeFingerprint)
    throw new Error(`Could not back up ${change.path}.`);
  const backupPath = `backups/${Buffer.from(change.path).toString("base64url")}`;
  await writeFileAtomically(
    path.join(journalDirectory, backupPath),
    state.content,
  );
  return {
    path: change.path,
    beforeFingerprint: change.beforeFingerprint,
    afterFingerprint: change.afterFingerprint,
    backupPath,
    status: "pending",
  };
}

export async function acquireLock(
  _m: MutationContext,
  root: string,
): Promise<ContentLock> {
  return await acquireContentLock(
    path.join(root, ".riebeckite", "mutations", "lock"),
    "Another content mutation is already applying or requires recovery.",
  );
}
