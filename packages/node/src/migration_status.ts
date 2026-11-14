import {
  type ContentMigrationHistory,
  type ContentMigrationListEntry,
  type ContentMigrationRecord,
  listContentMigrationEntries,
  upsertContentMigrationRecord,
} from "@riebeckite/core";
import type { ContentMigrationStatusReport } from "./file_system_content_migration_types.js";
import type { MigrationContext } from "./migration_context.js";

export async function status(
  m: MigrationContext,
): Promise<ContentMigrationStatusReport> {
  const state = await m.readState();
  const history = await m.readHistory();
  const reconciled = new Map<string, ContentMigrationRecord>();
  for (const record of state.migrations) {
    const resolved = await m.reconcile(record);
    if (resolved !== record)
      reconciled.set(`${record.id}@${record.version}`, resolved);
  }
  let nextState = state;
  if (reconciled.size > 0) {
    try {
      const lock = await m.acquireLock();
      try {
        const current = await m.readState();
        let merged = current;
        for (const record of current.migrations) {
          const resolved = reconciled.get(`${record.id}@${record.version}`);
          const original = state.migrations.find(
            (entry) =>
              entry.id === record.id && entry.version === record.version,
          );
          if (
            resolved &&
            original &&
            record.status === original.status &&
            record.updatedAt === original.updatedAt
          )
            merged = upsertContentMigrationRecord(merged, resolved);
        }
        if (merged !== current) {
          await lock.assertOwned();
          await m.writeState(merged);
        }
        nextState = merged;
      } finally {
        await lock.release();
      }
    } catch {}
  }
  const entries = nextState.migrations
    .map((record) => {
      const definition = m.options.registry
        .versions(record.id)
        .find((migration) => migration.version === record.version);
      const latest = m.options.registry.latest(record.id);
      return {
        id: record.id,
        version: record.version,
        latestVersion: latest?.version,
        status: record.status,
        definitionMatches:
          definition !== undefined &&
          definition.fingerprint === record.definitionFingerprint,
        planId: record.planId,
        appliedAt: record.appliedAt,
        updatedAt: record.updatedAt,
        journal: record.journalPath,
        error: record.error,
      };
    })
    .toSorted(
      (left, right) =>
        left.id.localeCompare(right.id) || left.version - right.version,
    );
  return {
    schemaVersion: 1,
    updatedAt: nextState.updatedAt,
    entries,
    migrations: listContentMigrationEntries(
      m.options.registry.migrations,
      nextState,
    ),
    historyCount: history.runs.length,
  };
}

export async function list(
  m: MigrationContext,
): Promise<readonly ContentMigrationListEntry[]> {
  return listContentMigrationEntries(
    m.options.registry.migrations,
    await m.readState(),
  );
}

export async function history(
  m: MigrationContext,
  options: { readonly limit?: number } = {},
): Promise<ContentMigrationHistory> {
  const history = await m.readHistory();
  if (options.limit === undefined) return history;
  if (!Number.isInteger(options.limit) || options.limit < 0)
    throw new Error("The history limit must be a non-negative integer.");
  return {
    ...history,
    runs: history.runs.slice(-options.limit),
  };
}
