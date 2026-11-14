import { findContentMigrationRecord } from "@riebeckite/core";
import {
  type ContentLock,
  errorMessage,
  fingerprintMutationPlan,
  isAppliedRecord,
  mutationIssue,
  sameMigrationPlan,
  sanitizeErrorMessage,
} from "./file_system_content_migration_helpers.js";
import type {
  ContentMigrationApplyOptions,
  ContentMigrationApplyResult,
} from "./file_system_content_migration_types.js";
import type { MigrationContext } from "./migration_context.js";

export async function apply(
  m: MigrationContext,
  options: ContentMigrationApplyOptions = {},
): Promise<ContentMigrationApplyResult> {
  const stored = options.planPath
    ? await m.loadPlan(options.planPath)
    : undefined;
  const requested = stored
    ? [...new Set(stored.migrations.map((migration) => migration.id))]
    : options.ids;
  const fresh = await m.plan({ ids: requested });
  if (stored && !sameMigrationPlan(stored, fresh))
    return {
      applied: false,
      skipped: false,
      plan: fresh,
      changedPaths: [],
      conflicts: [
        {
          severity: "error",
          code: "stale-plan",
          message:
            "The stored migration plan no longer matches the current content or migration definitions.",
        },
      ],
    };
  if (fresh.conflicts.length > 0)
    return {
      applied: false,
      skipped: false,
      plan: fresh,
      changedPaths: [],
      conflicts: fresh.conflicts,
    };

  let lock: ContentLock;
  try {
    lock = await m.acquireLock();
  } catch (error) {
    return {
      applied: false,
      skipped: false,
      plan: fresh,
      changedPaths: [],
      conflicts: [
        {
          severity: "error",
          code: "migration-locked",
          message: errorMessage(error),
        },
      ],
    };
  }
  try {
    const state = await m.readState();
    const conflicts = m.preflight(fresh, state);
    const currentContent = await m.currentContentFingerprint();
    if (currentContent !== fresh.baseContentFingerprint)
      conflicts.push({
        severity: "error",
        code: "stale-plan",
        message: "Content changed after the migration plan was created.",
      });
    if (conflicts.length > 0)
      return {
        applied: false,
        skipped: false,
        plan: fresh,
        changedPaths: [],
        conflicts,
      };

    const actionable = fresh.migrations.filter(
      (migration) =>
        !isAppliedRecord(
          findContentMigrationRecord(state, migration.id, migration.version),
          migration.fingerprint,
        ),
    );
    if (actionable.length === 0)
      return {
        applied: false,
        skipped: true,
        plan: fresh,
        changedPaths: [],
        conflicts: [],
      };

    const mutationPlan = await m.mutation.plan(fresh.operations);
    if (
      fingerprintMutationPlan(mutationPlan.operations, mutationPlan.changes) !==
      fresh.mutationPlanFingerprint
    )
      return {
        applied: false,
        skipped: false,
        plan: fresh,
        changedPaths: [],
        conflicts: [
          {
            severity: "error",
            code: "stale-plan",
            message:
              "The content mutation plan changed after the migration plan was created.",
          },
        ],
      };

    const now = new Date();
    let nextState = m.stateWith(fresh, actionable, state, "applying", now);
    await lock.assertOwned();
    await m.writeState(nextState);
    try {
      const result = await m.mutation.apply({
        ...mutationPlan,
        id: fresh.mutationPlanId,
      });
      if (!result.applied) {
        await lock.assertOwned();
        nextState = m.stateWith(
          fresh,
          actionable,
          nextState,
          "failed",
          new Date(),
          {
            error: result.conflicts
              .map((conflict) => conflict.message)
              .join(" "),
            journalPath: undefined,
          },
        );
        await m.writeState(nextState);
        await m.appendHistory(
          fresh,
          actionable,
          "failure",
          "required",
          undefined,
        );
        return {
          applied: false,
          skipped: false,
          plan: fresh,
          changedPaths: [],
          conflicts: result.conflicts.map((issue) =>
            mutationIssue(issue, "error"),
          ),
        };
      }
      const journalPath = result.journalPath
        ? m.relativeToContent(result.journalPath)
        : undefined;
      const appliedState = m.stateWith(
        fresh,
        actionable,
        nextState,
        "applied",
        new Date(),
        { journalPath, rolledBackAt: undefined },
      );
      nextState = m.supersede(actionable, appliedState, new Date());
      await lock.assertOwned();
      await m.writeState(nextState);
      await m.appendHistory(fresh, actionable, "success", "none", journalPath);
      return {
        applied: true,
        skipped: false,
        plan: fresh,
        journalPath: result.journalPath,
        changedPaths: result.appliedPaths,
        conflicts: [],
      };
    } catch (error) {
      await lock.assertOwned();
      const journal = await m.failedJournal(fresh);
      const message = sanitizeErrorMessage(error, m.contentDirectory);
      nextState = m.stateWith(
        fresh,
        actionable,
        nextState,
        journal ? "recovery-required" : "failed",
        new Date(),
        { journalPath: journal, error: message },
      );
      await m.writeState(nextState);
      await m.appendHistory(
        fresh,
        actionable,
        "failure",
        journal ? "required" : "none",
        journal,
      );
      return {
        applied: false,
        skipped: false,
        plan: fresh,
        changedPaths: [],
        conflicts: [
          {
            severity: "error",
            code: journal ? "recovery-required" : "apply-failed",
            message,
          },
        ],
      };
    }
  } finally {
    await lock.release();
  }
}
