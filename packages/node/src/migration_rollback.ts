import type { ContentMutationRollbackResult } from "@riebeckite/core";
import {
  errorMessage,
  mutationIssue,
  sanitizeErrorMessage,
} from "./file_system_content_migration_helpers.js";
import type {
  ContentMigrationRollbackOptions,
  ContentMigrationRollbackOutcome,
} from "./file_system_content_migration_types.js";
import type { MigrationContext } from "./migration_context.js";

export async function rollback(
  m: MigrationContext,
  options: ContentMigrationRollbackOptions,
): Promise<ContentMigrationRollbackOutcome> {
  const lock = await m.acquireLock();
  try {
    const state = await m.readState();
    const candidates = state.migrations.filter((record) =>
      options.planId !== undefined
        ? record.planId === options.planId
        : options.migrationId !== undefined
          ? record.id === options.migrationId
          : false,
    );
    const target = candidates
      .filter((record) => record.status === "applied")
      .toSorted((left, right) => right.version - left.version)[0];
    if (!target) {
      if (candidates.some((record) => record.status === "rolled-back"))
        return {
          rolledBack: false,
          skipped: true,
          restoredPaths: [],
          conflicts: [],
        };
      return {
        rolledBack: false,
        skipped: false,
        restoredPaths: [],
        conflicts: [
          {
            severity: "error",
            code: "rollback-not-applied",
            message: "The migration has no applied state to roll back.",
          },
        ],
      };
    }
    if (!target.journalPath)
      return {
        rolledBack: false,
        skipped: false,
        restoredPaths: [],
        conflicts: [
          {
            severity: "error",
            code: "rollback-journal-missing",
            message: "The applied migration has no mutation journal.",
          },
        ],
      };
    const batch = state.migrations.filter(
      (record) =>
        record.status === "applied" &&
        record.planId !== undefined &&
        record.planId === target.planId,
    );
    const journal = m.absoluteFromContent(target.journalPath);
    let result: ContentMutationRollbackResult;
    try {
      result = await m.mutation.rollback(journal);
    } catch (error) {
      return {
        rolledBack: false,
        skipped: false,
        restoredPaths: [],
        conflicts: [
          {
            severity: "error",
            code: "rollback-failed",
            message: errorMessage(error),
          },
        ],
      };
    }
    if (result.conflicts.length > 0) {
      await lock.assertOwned();
      const nextState = m.setStatuses(
        state,
        batch,
        "recovery-required",
        new Date(),
        target.journalPath,
        sanitizeErrorMessage(
          result.conflicts.map((issue) => issue.message).join(" "),
          m.contentDirectory,
        ),
      );
      await m.writeState(nextState);
      await m.appendHistoryForRecords(
        batch,
        "failure",
        "required",
        target.journalPath,
      );
      return {
        rolledBack: false,
        skipped: false,
        restoredPaths: result.restoredPaths,
        conflicts: result.conflicts.map((issue) =>
          mutationIssue(issue, "error"),
        ),
      };
    }
    const nextState = m.setStatuses(
      state,
      batch,
      "rolled-back",
      new Date(),
      target.journalPath,
      undefined,
      new Date(),
    );
    await lock.assertOwned();
    await m.writeState(nextState);
    await m.appendHistoryForRecords(
      batch,
      "rolled-back",
      "recovered",
      target.journalPath,
    );
    return {
      rolledBack: result.rolledBack,
      skipped: result.skipped,
      restoredPaths: result.restoredPaths,
      conflicts: [],
    };
  } finally {
    await lock.release();
  }
}
