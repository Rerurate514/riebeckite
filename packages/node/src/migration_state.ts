import fs from "node:fs/promises";
import path from "node:path";
import {
  appendContentMigrationHistory,
  type ContentMigrationHistory,
  type ContentMigrationHistoryRun,
  type ContentMigrationHistoryStatus,
  type ContentMigrationRecord,
  type ContentMigrationRecoveryState,
  type ContentMigrationState,
  type ContentMigrationStatus,
  findContentMigrationRecord,
  sanitizeContentMigrationPath,
  upsertContentMigrationRecord,
} from "@riebeckite/core";
import {
  acquireContentLock,
  type ContentLock,
} from "./file_system_content_migration_helpers.js";
import type { ContentMigrationPlan } from "./file_system_content_migration_types.js";
import type { MigrationContext } from "./migration_context.js";
import { fingerprintContentFiles } from "./migration_future.js";
import {
  migrationLockPath,
  readMigrationHistory,
  readMigrationState,
  writeMigrationHistory,
  writeMigrationState,
} from "./migration_state_store.js";

export function stateWith(
  _m: MigrationContext,
  plan: ContentMigrationPlan,
  migrations: ContentMigrationPlan["migrations"],
  state: ContentMigrationState,
  status: ContentMigrationStatus,
  now: Date,
  extra: {
    readonly journalPath?: string;
    readonly error?: string;
    readonly rolledBackAt?: string;
  } = {},
): ContentMigrationState {
  let next = state;
  for (const migration of migrations) {
    const prior = findContentMigrationRecord(
      state,
      migration.id,
      migration.version,
    );
    next = upsertContentMigrationRecord(
      next,
      {
        id: migration.id,
        version: migration.version,
        definitionFingerprint: migration.fingerprint,
        status,
        planId: plan.id,
        planFingerprint: plan.planFingerprint,
        contentFingerprint: plan.baseContentFingerprint,
        mutationPlanId: plan.mutationPlanId,
        mutationPlanFingerprint: plan.mutationPlanFingerprint,
        journalPath: extra.journalPath ?? prior?.journalPath,
        changedPaths: plan.changes.map((change) => change.path),
        updatedAt: now.toISOString(),
        appliedAt:
          status === "applied"
            ? (prior?.appliedAt ?? now.toISOString())
            : prior?.appliedAt,
        rolledBackAt: extra.rolledBackAt ?? prior?.rolledBackAt,
        error: extra.error,
      },
      now,
    );
  }
  return next;
}

export function supersede(
  _m: MigrationContext,
  migrations: ContentMigrationPlan["migrations"],
  state: ContentMigrationState,
  now: Date,
): ContentMigrationState {
  let next = state;
  for (const migration of migrations) {
    for (const record of state.migrations) {
      if (
        record.id === migration.id &&
        record.version < migration.version &&
        record.status === "applied"
      )
        next = upsertContentMigrationRecord(
          next,
          {
            ...record,
            status: "superseded",
            updatedAt: now.toISOString(),
          },
          now,
        );
    }
  }
  return next;
}

export function setStatuses(
  _m: MigrationContext,
  state: ContentMigrationState,
  records: readonly ContentMigrationRecord[],
  status: ContentMigrationStatus,
  now: Date,
  journalPath?: string,
  error?: string,
  rolledBackAt?: Date,
): ContentMigrationState {
  const keys = new Set(
    records.map((record) => `${record.id}@${record.version}`),
  );
  let next = state;
  for (const record of state.migrations) {
    if (!keys.has(`${record.id}@${record.version}`)) continue;
    next = upsertContentMigrationRecord(
      next,
      {
        ...record,
        status,
        journalPath: journalPath ?? record.journalPath,
        updatedAt: now.toISOString(),
        appliedAt:
          status === "applied"
            ? (record.appliedAt ?? now.toISOString())
            : record.appliedAt,
        rolledBackAt: rolledBackAt?.toISOString() ?? record.rolledBackAt,
        error,
      },
      now,
    );
  }
  return next;
}

export async function appendHistory(
  m: MigrationContext,
  plan: ContentMigrationPlan,
  migrations: ContentMigrationPlan["migrations"],
  status: ContentMigrationHistoryStatus,
  recoveryState: ContentMigrationRecoveryState,
  journal: string | undefined,
): Promise<void> {
  if (migrations.length === 0) return;
  const created = plan.changes.filter(
    (change) => change.beforeFingerprint === null,
  ).length;
  const deleted = plan.changes.filter(
    (change) => change.afterFingerprint === null,
  ).length;
  const updated = plan.changes.length - created - deleted;
  const history = await m.readHistory();
  let next = history;
  for (const migration of migrations) {
    const run: ContentMigrationHistoryRun = {
      id: migration.id,
      version: migration.version,
      at: new Date().toISOString(),
      planId: plan.id,
      mutationPlanId: plan.mutationPlanId,
      planFingerprint: plan.planFingerprint,
      contentFingerprint: plan.baseContentFingerprint,
      mutationPlanFingerprint: plan.mutationPlanFingerprint,
      status,
      created,
      updated,
      deleted,
      moved: plan.impact.moved,
      changedCount: plan.changes.length,
      recoveryState,
      journal,
    };
    next = appendContentMigrationHistory(next, run);
  }
  await m.writeHistory(next);
}

export async function appendHistoryForRecords(
  m: MigrationContext,
  records: readonly ContentMigrationRecord[],
  status: ContentMigrationHistoryStatus,
  recoveryState: ContentMigrationRecoveryState,
  journal: string | undefined,
): Promise<void> {
  if (records.length === 0) return;
  const history = await m.readHistory();
  let next = history;
  for (const record of records) {
    if (!record.planId) continue;
    const run: ContentMigrationHistoryRun = {
      id: record.id,
      version: record.version,
      at: new Date().toISOString(),
      planId: record.planId,
      mutationPlanId: record.mutationPlanId,
      planFingerprint: record.planFingerprint ?? "",
      contentFingerprint: record.contentFingerprint ?? "",
      mutationPlanFingerprint: record.mutationPlanFingerprint,
      status,
      created: 0,
      updated: 0,
      deleted: 0,
      moved: 0,
      changedCount: record.changedPaths.length,
      recoveryState,
      journal,
    };
    next = appendContentMigrationHistory(next, run);
  }
  await m.writeHistory(next);
}

export async function failedJournal(
  m: MigrationContext,
  plan: ContentMigrationPlan,
): Promise<string | undefined> {
  const journal = path.join(
    m.contentDirectory,
    ".riebeckite",
    "mutations",
    plan.mutationPlanId,
    "journal.json",
  );
  try {
    await fs.access(journal);
    return m.relativeToContent(journal);
  } catch {
    return undefined;
  }
}

export async function currentContentFingerprint(
  m: MigrationContext,
): Promise<string> {
  const entries = (await m.source.scan()).filter((entry) =>
    entry.path.toLowerCase().endsWith(".md"),
  );
  return fingerprintContentFiles(
    await Promise.all(
      entries.map(async (entry) => ({
        path: entry.path,
        content: await m.source.read(entry),
      })),
    ),
  );
}

export async function readState(
  m: MigrationContext,
): Promise<ContentMigrationState> {
  return readMigrationState(m.contentDirectory);
}

export async function writeState(
  m: MigrationContext,
  state: ContentMigrationState,
): Promise<void> {
  return writeMigrationState(m.contentDirectory, state);
}

export async function readHistory(
  m: MigrationContext,
): Promise<ContentMigrationHistory> {
  return readMigrationHistory(m.contentDirectory);
}

export async function writeHistory(
  m: MigrationContext,
  history: ContentMigrationHistory,
): Promise<void> {
  return writeMigrationHistory(m.contentDirectory, history);
}

export function relativeToContent(m: MigrationContext, target: string): string {
  return sanitizeContentMigrationPath(
    path.relative(m.contentDirectory, target).split(path.sep).join("/"),
  );
}

export function absoluteFromContent(
  m: MigrationContext,
  target: string,
): string {
  return path.isAbsolute(target)
    ? target
    : path.join(m.contentDirectory, target);
}

export async function acquireLock(m: MigrationContext): Promise<ContentLock> {
  return await acquireContentLock(
    migrationLockPath(m.contentDirectory),
    "Another migration is already applying or requires recovery.",
  );
}

export function contentDirectory(m: MigrationContext): string {
  return m.options.contentDirectory;
}
