import {
  CONTENT_MIGRATION_HISTORY_LIMIT,
  type ContentMigrationHistory,
  type ContentMigrationHistoryRun,
  type ContentMigrationListEntry,
  type ContentMigrationRecord,
  type ContentMigrationState,
  fail,
  isRecord,
  readHistoryStatus,
  readNumber,
  readPaths,
  readRecoveryState,
  readStatus,
  readString,
  readTimestamp,
  sanitizeContentMigrationPath,
} from "./migration_state_part1.js";
import type { ContentMigration } from "./migration_types.js";

export function parseRecord(value: unknown): ContentMigrationRecord {
  if (!isRecord(value)) fail("invalid-state", "Migration record is invalid.");
  return {
    id: readString(value.id, "id") as string,
    version: readNumber(value.version, "version"),
    definitionFingerprint: readString(
      value.definitionFingerprint,
      "definitionFingerprint",
    ) as string,
    status: readStatus(value.status),
    planId: readString(value.planId, "planId", true),
    planFingerprint: readString(value.planFingerprint, "planFingerprint", true),
    contentFingerprint: readString(
      value.contentFingerprint,
      "contentFingerprint",
      true,
    ),
    mutationPlanId: readString(value.mutationPlanId, "mutationPlanId", true),
    mutationPlanFingerprint: readString(
      value.mutationPlanFingerprint,
      "mutationPlanFingerprint",
      true,
    ),
    journalPath:
      value.journalPath === undefined
        ? undefined
        : sanitizeContentMigrationPath(
            readString(value.journalPath, "journalPath") as string,
          ),
    changedPaths: readPaths(value.changedPaths ?? []),
    updatedAt: readTimestamp(value.updatedAt, "updatedAt") as string,
    appliedAt: readTimestamp(value.appliedAt, "appliedAt", true),
    rolledBackAt: readTimestamp(value.rolledBackAt, "rolledBackAt", true),
    error: readString(value.error, "error", true),
  };
}

export function parseHistoryRun(value: unknown): ContentMigrationHistoryRun {
  if (!isRecord(value)) fail("invalid-state", "History run is invalid.");
  return {
    id: readString(value.id, "id") as string,
    version: readNumber(value.version, "version"),
    at: readTimestamp(value.at, "at") as string,
    planId: readString(value.planId, "planId") as string,
    mutationPlanId: readString(value.mutationPlanId, "mutationPlanId", true),
    planFingerprint: readString(
      value.planFingerprint,
      "planFingerprint",
    ) as string,
    contentFingerprint: readString(
      value.contentFingerprint,
      "contentFingerprint",
    ) as string,
    mutationPlanFingerprint: readString(
      value.mutationPlanFingerprint,
      "mutationPlanFingerprint",
      true,
    ),
    status: readHistoryStatus(value.status),
    created: readNumber(value.created, "created"),
    updated: readNumber(value.updated, "updated"),
    deleted: readNumber(value.deleted, "deleted"),
    moved: readNumber(value.moved, "moved"),
    changedCount: readNumber(value.changedCount, "changedCount"),
    recoveryState: readRecoveryState(value.recoveryState),
    journal:
      value.journal === undefined
        ? undefined
        : sanitizeContentMigrationPath(
            readString(value.journal, "journal") as string,
          ),
    error: readString(value.error, "error", true),
  };
}

export function emptyContentMigrationState(
  now: Date = new Date(),
): ContentMigrationState {
  return { schemaVersion: 1, updatedAt: now.toISOString(), migrations: [] };
}

export function emptyContentMigrationHistory(
  now: Date = new Date(),
): ContentMigrationHistory {
  return { schemaVersion: 1, updatedAt: now.toISOString(), runs: [] };
}

export function parseContentMigrationState(
  value: unknown,
): ContentMigrationState {
  if (!isRecord(value) || value.schemaVersion !== 1)
    fail("invalid-state", "Unsupported migration state schema.");
  if (!Array.isArray(value.migrations))
    fail("invalid-state", "migrations must be an array.");
  return {
    schemaVersion: 1,
    updatedAt: readTimestamp(value.updatedAt, "updatedAt") as string,
    migrations: value.migrations.map(parseRecord),
  };
}

export function parseContentMigrationHistory(
  value: unknown,
): ContentMigrationHistory {
  if (!isRecord(value) || value.schemaVersion !== 1)
    fail("invalid-state", "Unsupported migration history schema.");
  if (!Array.isArray(value.runs))
    fail("invalid-state", "runs must be an array.");
  return {
    schemaVersion: 1,
    updatedAt: readTimestamp(value.updatedAt, "updatedAt") as string,
    runs: value.runs.map(parseHistoryRun),
  };
}

export function upsertContentMigrationRecord(
  state: ContentMigrationState,
  record: ContentMigrationRecord,
  now: Date = new Date(),
): ContentMigrationState {
  const migrations = state.migrations.filter(
    (entry) => !(entry.id === record.id && entry.version === record.version),
  );
  migrations.push(record);
  migrations.sort(
    (left, right) =>
      left.id.localeCompare(right.id) || left.version - right.version,
  );
  return { schemaVersion: 1, updatedAt: now.toISOString(), migrations };
}

export function findContentMigrationRecord(
  state: ContentMigrationState,
  id: string,
  version?: number,
): ContentMigrationRecord | undefined {
  const records = state.migrations
    .filter((entry) => entry.id === id)
    .toSorted((left, right) => right.version - left.version);
  if (version !== undefined)
    return records.find((entry) => entry.version === version);
  return records[0];
}

export function appendContentMigrationHistory(
  history: ContentMigrationHistory,
  run: ContentMigrationHistoryRun,
  limit: number = CONTENT_MIGRATION_HISTORY_LIMIT,
): ContentMigrationHistory {
  if (!Number.isInteger(limit) || limit < 1)
    fail("invalid-limit", "History limit must be a positive integer.");
  return {
    schemaVersion: 1,
    updatedAt: run.at,
    runs: [...history.runs, run].slice(-limit),
  };
}

export function listContentMigrationEntries(
  migrations: readonly ContentMigration[],
  state: ContentMigrationState,
): readonly ContentMigrationListEntry[] {
  const byId = new Map<string, ContentMigration[]>();
  for (const migration of migrations) {
    const versions = byId.get(migration.id) ?? [];
    versions.push(migration);
    byId.set(migration.id, versions);
  }
  return [...byId.entries()]
    .map(([id, versions]) => {
      const sorted = versions.toSorted(
        (left, right) => right.version - left.version,
      );
      const latest = sorted[0] as ContentMigration;
      const records = state.migrations.filter((entry) => entry.id === id);
      const applied = records
        .filter((entry) => entry.status === "applied")
        .toSorted((left, right) => right.version - left.version)[0];
      const current = records.find(
        (entry) =>
          entry.version === latest.version &&
          entry.definitionFingerprint === latest.fingerprint,
      );
      const pendingVersions = sorted
        .filter(
          (migration) =>
            !records.some(
              (entry) =>
                entry.version === migration.version &&
                entry.status === "applied",
            ),
        )
        .map((migration) => migration.version)
        .toSorted((left, right) => left - right);
      return {
        id,
        latestVersion: latest.version,
        status: current?.status ?? applied?.status ?? "pending",
        appliedVersion: applied?.version,
        definitionMatches: current !== undefined || applied === undefined,
        pendingVersions,
      };
    })
    .toSorted((left, right) => left.id.localeCompare(right.id));
}
