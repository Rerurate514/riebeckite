import fs from "node:fs/promises";
import path from "node:path";
import type {
  ContentMutationIssue,
  ContentMutationRecoveryResult,
} from "@riebeckite/core";
import type { MutationContext } from "./mutation_context.js";
import { fingerprint, readState } from "./mutation_files.js";
import { type JournalChange, parseJournal } from "./mutation_journal.js";
import { isWithin } from "./mutation_paths.js";
import { writeJsonAtomically } from "./mutation_writes.js";

export async function recover(
  m: MutationContext,
  journalPath: string,
): Promise<ContentMutationRecoveryResult> {
  const root = await m.root();
  const absoluteJournal = path.resolve(journalPath);
  const mutationRoot = path.join(root, ".riebeckite", "mutations");
  if (!isWithin(mutationRoot, absoluteJournal))
    throw new Error("Journal path is outside the mutation directory.");
  const journalDirectory = path.dirname(absoluteJournal);
  const lock = await m.acquireLock(root);
  try {
    const journal = parseJournal(await fs.readFile(absoluteJournal, "utf8"));
    if (
      path.basename(absoluteJournal) !== "journal.json" ||
      path.basename(journalDirectory) !== journal.id ||
      path.basename(journalDirectory) === "plans"
    )
      throw new Error("Journal path does not belong to its mutation.");
    if (journal.state === "complete" || journal.state === "recovered")
      return {
        journalPath: absoluteJournal,
        recovered: false,
        restoredPaths: [],
        conflicts: [],
      };
    const conflicts: ContentMutationIssue[] = [];
    const rollback: JournalChange[] = [];
    for (const change of journal.changes) {
      let current: string | null;
      try {
        current = (await readState(root, change.path))?.fingerprint ?? null;
      } catch (error) {
        conflicts.push({
          severity: "error",
          code: "recovery-conflict",
          path: change.path,
          message: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
      if (current === change.beforeFingerprint) continue;
      if (current !== change.afterFingerprint) {
        conflicts.push({
          severity: "error",
          code: "recovery-conflict",
          path: change.path,
          message: "The file changed after the interrupted mutation.",
        });
        continue;
      }
      rollback.push(change);
    }
    if (conflicts.length > 0)
      return {
        journalPath: absoluteJournal,
        recovered: false,
        restoredPaths: [],
        conflicts,
      };
    const backups = new Map<string, Uint8Array>();
    for (const change of rollback) {
      if (change.beforeFingerprint === null) continue;
      if (!change.backupPath) {
        conflicts.push({
          severity: "error",
          code: "recovery-backup-invalid",
          path: change.path,
          message: "The journal does not reference a backup.",
        });
        continue;
      }
      const backup = path.resolve(journalDirectory, change.backupPath);
      if (!isWithin(journalDirectory, backup)) {
        conflicts.push({
          severity: "error",
          code: "recovery-backup-invalid",
          path: change.path,
          message: "The backup path is outside the mutation journal.",
        });
        continue;
      }
      try {
        const content = await fs.readFile(backup);
        if (fingerprint(content) !== change.beforeFingerprint)
          throw new Error("The backup fingerprint does not match.");
        backups.set(change.path, content);
      } catch (error) {
        conflicts.push({
          severity: "error",
          code: "recovery-backup-invalid",
          path: change.path,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    if (conflicts.length > 0)
      return {
        journalPath: absoluteJournal,
        recovered: false,
        restoredPaths: [],
        conflicts,
      };
    const restoredPaths: string[] = [];
    for (const change of rollback) {
      await lock.assertOwned();
      const conflict = await m.restoreChange(
        root,
        journalDirectory,
        change,
        backups.get(change.path),
        lock.assertOwned,
      );
      if (conflict) {
        conflicts.push(conflict);
        break;
      }
      restoredPaths.push(change.path);
    }
    if (conflicts.length > 0)
      return {
        journalPath: absoluteJournal,
        recovered: false,
        restoredPaths,
        conflicts,
      };
    await lock.assertOwned();
    journal.state = "recovered";
    await writeJsonAtomically(absoluteJournal, journal);
    return {
      journalPath: absoluteJournal,
      recovered: true,
      restoredPaths,
      conflicts: [],
    };
  } finally {
    await lock.release();
  }
}
