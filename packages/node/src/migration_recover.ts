import path from "node:path";
import type {
  ContentMigrationDiagnostic,
  ContentMigrationRecord,
} from "@riebeckite/core";
import {
  errorMessage,
  exists,
  isWithin,
  journalMatchesApplied,
  mutationIssue,
  readJournalSnapshot,
} from "./file_system_content_migration_helpers.js";
import type {
  ContentMigrationRecoverOptions,
  ContentMigrationRecoveryResult,
} from "./file_system_content_migration_types.js";
import type { MigrationContext } from "./migration_context.js";

export async function recover(
  m: MigrationContext,
  options: ContentMigrationRecoverOptions = {},
): Promise<ContentMigrationRecoveryResult> {
  const lock = await m.acquireLock();
  try {
    const state = await m.readState();
    const journalPath =
      options.journal !== undefined
        ? m.absoluteFromContent(options.journal)
        : undefined;
    if (journalPath !== undefined && !isWithin(m.contentDirectory, journalPath))
      throw new Error(
        `The migration journal "${options.journal}" is outside the content directory.`,
      );
    const targets = state.migrations.filter((record) => {
      if (options.journal !== undefined)
        return (
          record.journalPath === options.journal ||
          (record.mutationPlanId !== undefined &&
            journalPath !== undefined &&
            path.basename(path.dirname(journalPath)) === record.mutationPlanId)
        );
      if (options.migrationId !== undefined)
        return (
          record.id === options.migrationId &&
          ["applying", "recovery-required", "failed"].includes(record.status)
        );
      return ["applying", "recovery-required", "failed"].includes(
        record.status,
      );
    });
    const journals = new Map<string, ContentMigrationRecord[]>();
    for (const record of targets) {
      const resolved =
        record.journalPath !== undefined
          ? m.absoluteFromContent(record.journalPath)
          : record.mutationPlanId !== undefined
            ? path.join(
                m.contentDirectory,
                ".riebeckite",
                "mutations",
                record.mutationPlanId,
                "journal.json",
              )
            : undefined;
      if (!resolved || !(await exists(resolved))) continue;
      const records = journals.get(resolved) ?? [];
      records.push(record);
      journals.set(resolved, records);
    }
    if (journalPath !== undefined) {
      if (!(await exists(journalPath)))
        return {
          recovered: false,
          applied: false,
          skipped: false,
          restoredPaths: [],
          conflicts: [
            {
              severity: "error",
              code: "journal-missing",
              message: "The mutation journal does not exist.",
            },
          ],
        };
      if (!journals.has(journalPath)) journals.set(journalPath, []);
    }
    if (journals.size === 0)
      return {
        recovered: false,
        applied: false,
        skipped: true,
        restoredPaths: [],
        conflicts: [],
      };
    let nextState = state;
    let recovered = false;
    let applied = false;
    const restoredPaths: string[] = [];
    const conflicts: ContentMigrationDiagnostic[] = [];
    for (const [journal, records] of journals) {
      const relativeJournal = isWithin(m.contentDirectory, journal)
        ? m.relativeToContent(journal)
        : undefined;
      try {
        const result = await m.mutation.recover(journal);
        restoredPaths.push(...result.restoredPaths);
        if (result.conflicts.length > 0) {
          conflicts.push(
            ...result.conflicts.map((issue) => mutationIssue(issue, "error")),
          );
          nextState = m.setStatuses(
            nextState,
            records,
            "recovery-required",
            new Date(),
            relativeJournal,
          );
          await m.appendHistoryForRecords(
            records,
            "failure",
            "required",
            relativeJournal,
          );
          continue;
        }
        if (result.recovered) {
          recovered = true;
          nextState = m.setStatuses(
            nextState,
            records,
            "rolled-back",
            new Date(),
            relativeJournal,
          );
          await m.appendHistoryForRecords(
            records,
            "rolled-back",
            "recovered",
            relativeJournal,
          );
          continue;
        }
        const snapshot = await readJournalSnapshot(journal);
        if (
          snapshot?.state === "complete" &&
          (await journalMatchesApplied(m.contentDirectory, snapshot))
        ) {
          applied = true;
          nextState = m.setStatuses(
            nextState,
            records,
            "applied",
            new Date(),
            relativeJournal,
          );
          await m.appendHistoryForRecords(
            records,
            "success",
            "recovered",
            relativeJournal,
          );
        } else if (
          snapshot?.state === "rolled-back" ||
          snapshot?.state === "recovered"
        ) {
          recovered = true;
          nextState = m.setStatuses(
            nextState,
            records,
            "rolled-back",
            new Date(),
            relativeJournal,
          );
          await m.appendHistoryForRecords(
            records,
            "rolled-back",
            "recovered",
            relativeJournal,
          );
        } else {
          nextState = m.setStatuses(
            nextState,
            records,
            "recovery-required",
            new Date(),
            relativeJournal,
          );
          conflicts.push({
            severity: "error",
            code: "journal-not-recoverable",
            message: "The mutation journal is not in a recoverable state.",
          });
        }
      } catch (error) {
        conflicts.push({
          severity: "error",
          code: "recovery-failed",
          message: errorMessage(error),
        });
        nextState = m.setStatuses(
          nextState,
          records,
          "recovery-required",
          new Date(),
          relativeJournal,
        );
        await m.appendHistoryForRecords(
          records,
          "failure",
          "required",
          relativeJournal,
        );
      }
    }
    await lock.assertOwned();
    await m.writeState(nextState);
    return {
      recovered,
      applied,
      skipped: false,
      restoredPaths,
      conflicts,
    };
  } finally {
    await lock.release();
  }
}

export async function reconcile(
  m: MigrationContext,
  record: ContentMigrationRecord,
): Promise<ContentMigrationRecord> {
  if (record.status !== "applying") return record;
  const journal = record.journalPath
    ? m.absoluteFromContent(record.journalPath)
    : record.mutationPlanId
      ? path.join(
          m.contentDirectory,
          ".riebeckite",
          "mutations",
          record.mutationPlanId,
          "journal.json",
        )
      : undefined;
  const snapshot = journal ? await readJournalSnapshot(journal) : undefined;
  if (!snapshot)
    return {
      ...record,
      status: "failed",
      updatedAt: new Date().toISOString(),
      ...(journal ? { journalPath: m.relativeToContent(journal) } : {}),
      error: "The mutation journal is missing.",
    };
  const relative = m.relativeToContent(journal as string);
  if (snapshot.state === "complete") {
    if (await journalMatchesApplied(m.contentDirectory, snapshot))
      return {
        ...record,
        status: "applied",
        journalPath: relative,
        appliedAt: record.appliedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    return {
      ...record,
      status: "recovery-required",
      journalPath: relative,
      updatedAt: new Date().toISOString(),
      error: "Content changed after the mutation journal completed.",
    };
  }
  if (snapshot.state === "rolled-back" || snapshot.state === "recovered")
    return {
      ...record,
      status: "rolled-back",
      journalPath: relative,
      rolledBackAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  return {
    ...record,
    status: "recovery-required",
    journalPath: relative,
    updatedAt: new Date().toISOString(),
  };
}
