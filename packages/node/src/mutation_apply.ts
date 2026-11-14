import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  ContentMutationIssue,
  ContentMutationPlan,
  ContentMutationResult,
} from "@riebeckite/core";
import type { MutationContext } from "./mutation_context.js";
import { fingerprint, recoveryConflict } from "./mutation_files.js";
import {
  type JournalChange,
  type MutationJournal,
  markApplied,
} from "./mutation_journal.js";
import { safeFilePath } from "./mutation_paths.js";
import {
  removeFileIfUnchanged,
  restoreCapturedFile,
  writeFileAtomically,
  writeFileExclusive,
  writeJsonAtomically,
} from "./mutation_writes.js";

export async function apply(
  m: MutationContext,
  plan: ContentMutationPlan,
): Promise<ContentMutationResult> {
  const root = await m.root();
  const preconditionConflicts = await m.verifyPreconditions(root, plan.changes);
  if (preconditionConflicts.length > 0)
    return {
      planId: plan.id,
      applied: false,
      appliedPaths: [],
      conflicts: preconditionConflicts,
    };
  const revalidated = await m.revalidatePlan(plan);
  if (revalidated.length > 0)
    return {
      planId: plan.id,
      applied: false,
      appliedPaths: [],
      conflicts: revalidated,
    };
  if (plan.conflicts.length > 0)
    return {
      planId: plan.id,
      applied: false,
      appliedPaths: [],
      conflicts: plan.conflicts,
    };
  const lock = await m.acquireLock(root);
  try {
    const conflicts = await m.verifyPreconditions(root, plan.changes);
    if (conflicts.length > 0)
      return { planId: plan.id, applied: false, appliedPaths: [], conflicts };
    const journalDirectory = path.join(
      root,
      ".riebeckite",
      "mutations",
      plan.id,
    );
    await lock.assertOwned();
    await fs.mkdir(path.join(journalDirectory, "backups"), {
      recursive: true,
    });
    const journalPath = path.join(journalDirectory, "journal.json");
    const journal: MutationJournal = {
      version: 1,
      id: plan.id,
      state: "prepared",
      changes: await Promise.all(
        plan.changes.map((change) => m.backup(root, journalDirectory, change)),
      ),
    };
    await lock.assertOwned();
    await writeJsonAtomically(journalPath, journal);
    journal.state = "applying";
    await writeJsonAtomically(journalPath, journal);
    const appliedPaths: string[] = [];
    try {
      for (const change of plan.changes.filter(
        (change) => change.content !== null,
      )) {
        await m.options.beforeWrite?.(change.path);
        await lock.assertOwned();
        if (change.content === null)
          throw new Error("Mutation content is missing.");
        await writeFileAtomically(
          await safeFilePath(root, change.path, true),
          change.content,
          change.beforeFingerprint,
          path.join(journalDirectory, "quarantine"),
        );
        await lock.assertOwned();
        markApplied(journal, change.path);
        await writeJsonAtomically(journalPath, journal);
        appliedPaths.push(change.path);
      }
      for (const change of plan.changes.filter(
        (change) => change.content === null,
      )) {
        await m.options.beforeWrite?.(change.path);
        await lock.assertOwned();
        const target = await safeFilePath(root, change.path, false);
        await removeFileIfUnchanged(
          target,
          change.beforeFingerprint,
          journalDirectory,
          change.path,
        );
        await lock.assertOwned();
        markApplied(journal, change.path);
        await writeJsonAtomically(journalPath, journal);
        appliedPaths.push(change.path);
      }
    } catch (error) {
      try {
        await lock.assertOwned();
      } catch {
        throw error;
      }
      journal.state = "failed";
      await writeJsonAtomically(journalPath, journal);
      throw error;
    }
    await lock.assertOwned();
    journal.state = "complete";
    await writeJsonAtomically(journalPath, journal);
    return {
      planId: plan.id,
      applied: true,
      journalPath,
      appliedPaths,
      conflicts: [],
    };
  } finally {
    await lock.release();
  }
}

export async function restoreChange(
  m: MutationContext,
  root: string,
  journalDirectory: string,
  change: JournalChange,
  backup: Uint8Array | undefined,
  assertOwned: () => Promise<void>,
): Promise<ContentMutationIssue | null> {
  if (change.afterFingerprint === null) {
    if (change.beforeFingerprint === null || !backup)
      return recoveryConflict(
        change.path,
        "The deletion cannot be rolled back safely.",
      );
    const target = await safeFilePath(root, change.path, true);
    try {
      await writeFileExclusive(target, backup);
      return null;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST")
        return recoveryConflict(
          change.path,
          "A file appeared during recovery; it was not overwritten.",
        );
      throw error;
    }
  }
  await m.options.beforeRecoveryRestore?.(change.path);
  await assertOwned();
  const target = await safeFilePath(root, change.path, false);
  const captureDirectory = path.join(journalDirectory, "quarantine");
  await fs.mkdir(captureDirectory, { recursive: true });
  const captured = path.join(captureDirectory, `${randomUUID()}.capture`);
  try {
    await fs.rename(target, captured);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return recoveryConflict(
        change.path,
        "The file disappeared before it could be verified.",
      );
    throw error;
  }
  const content = await fs.readFile(captured);
  if (fingerprint(content) !== change.afterFingerprint) {
    await restoreCapturedFile(target, captured);
    return recoveryConflict(
      change.path,
      "The file changed after verification; its content was preserved and not overwritten.",
    );
  }
  await m.options.afterRecoveryCapture?.(change.path);
  if (change.beforeFingerprint === null) {
    try {
      await fs.lstat(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
    return recoveryConflict(
      change.path,
      "A file appeared during recovery; it was not deleted.",
    );
  }
  try {
    await writeFileExclusive(target, backup as Uint8Array);
    return null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      return recoveryConflict(
        change.path,
        "A file appeared during recovery; it was not overwritten.",
      );
    throw error;
  }
}
