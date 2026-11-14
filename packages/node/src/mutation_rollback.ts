import fs from "node:fs/promises";
import path from "node:path";
import type {
  ContentMutationIssue,
  ContentMutationRollbackResult,
} from "@riebeckite/core";
import type { MutationContext } from "./mutation_context.js";
import { fingerprint, readState } from "./mutation_files.js";
import { parseJournal } from "./mutation_journal.js";
import { isWithin } from "./mutation_paths.js";
import { writeJsonAtomically } from "./mutation_writes.js";

export async function rollback(
  m: MutationContext,
  journalPath: string,
): Promise<ContentMutationRollbackResult> {
  const root = await m.root();
  const absoluteJournal = path.resolve(journalPath);
  const mutationRoot = path.join(root, ".riebeckite", "mutations");
  const journalDirectory = path.dirname(absoluteJournal);
  const lock = await m.acquireLock(root);
  try {
    if (!isWithin(mutationRoot, absoluteJournal))
      throw new Error("Journal path is outside the mutation directory.");
    const journal = parseJournal(await fs.readFile(absoluteJournal, "utf8"));
    if (
      path.basename(absoluteJournal) !== "journal.json" ||
      path.basename(journalDirectory) !== journal.id ||
      path.basename(journalDirectory) === "plans"
    )
      throw new Error("Journal path does not belong to its mutation.");
    if (journal.state === "rolled-back")
      return {
        journalPath: absoluteJournal,
        rolledBack: false,
        skipped: true,
        restoredPaths: [],
        conflicts: [],
      };
    if (journal.state !== "complete")
      return {
        journalPath: absoluteJournal,
        rolledBack: false,
        skipped: false,
        restoredPaths: [],
        conflicts: [
          {
            severity: "error",
            code: "rollback-journal-incomplete",
            message: "Only a completed mutation can be rolled back.",
          },
        ],
      };
    const conflicts: ContentMutationIssue[] = [];
    const backups = new Map<string, Uint8Array>();
    for (const change of journal.changes) {
      let current: string | null = null;
      try {
        current = (await readState(root, change.path))?.fingerprint ?? null;
      } catch (error) {
        conflicts.push({
          severity: "error",
          code: "rollback-conflict",
          path: change.path,
          message: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
      if (current !== change.afterFingerprint) {
        conflicts.push({
          severity: "error",
          code: "rollback-conflict",
          path: change.path,
          message: "The file changed after the mutation was applied.",
        });
        continue;
      }
      if (change.beforeFingerprint === null) continue;
      if (!change.backupPath) {
        conflicts.push({
          severity: "error",
          code: "rollback-backup-invalid",
          path: change.path,
          message: "The journal does not reference a backup.",
        });
        continue;
      }
      const backup = path.resolve(journalDirectory, change.backupPath);
      if (!isWithin(journalDirectory, backup)) {
        conflicts.push({
          severity: "error",
          code: "rollback-backup-invalid",
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
          code: "rollback-backup-invalid",
          path: change.path,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    if (conflicts.length > 0)
      return {
        journalPath: absoluteJournal,
        rolledBack: false,
        skipped: false,
        restoredPaths: [],
        conflicts,
      };
    const restoredPaths: string[] = [];
    for (const change of journal.changes) {
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
        rolledBack: false,
        skipped: false,
        restoredPaths,
        conflicts,
      };
    await lock.assertOwned();
    journal.state = "rolled-back";
    await writeJsonAtomically(absoluteJournal, journal);
    return {
      journalPath: absoluteJournal,
      rolledBack: true,
      skipped: false,
      restoredPaths,
      conflicts: [],
    };
  } finally {
    await lock.release();
  }
}
