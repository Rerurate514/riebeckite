export type ContentMigrationStatus =
  | "pending"
  | "planned"
  | "applying"
  | "applied"
  | "failed"
  | "recovery-required"
  | "rolled-back"
  | "superseded";

export type ContentMigrationRecoveryState = "none" | "required" | "recovered";

export type ContentMigrationRecord = {
  readonly id: string;
  readonly version: number;
  readonly definitionFingerprint: string;
  readonly status: ContentMigrationStatus;
  readonly planId?: string;
  readonly planFingerprint?: string;
  readonly contentFingerprint?: string;
  readonly mutationPlanId?: string;
  readonly mutationPlanFingerprint?: string;
  readonly journalPath?: string;
  readonly changedPaths: readonly string[];
  readonly updatedAt: string;
  readonly appliedAt?: string;
  readonly rolledBackAt?: string;
  readonly error?: string;
};

export type ContentMigrationState = {
  readonly schemaVersion: 1;
  readonly updatedAt: string;
  readonly migrations: readonly ContentMigrationRecord[];
};

export type ContentMigrationHistoryStatus =
  | "success"
  | "failure"
  | "rolled-back";

export type ContentMigrationHistoryRun = {
  readonly id: string;
  readonly version: number;
  readonly at: string;
  readonly planId: string;
  readonly mutationPlanId?: string;
  readonly planFingerprint: string;
  readonly contentFingerprint: string;
  readonly mutationPlanFingerprint?: string;
  readonly status: ContentMigrationHistoryStatus;
  readonly created: number;
  readonly updated: number;
  readonly deleted: number;
  readonly moved: number;
  readonly changedCount: number;
  readonly recoveryState: ContentMigrationRecoveryState;
  readonly journal?: string;
  readonly error?: string;
};

export type ContentMigrationHistory = {
  readonly schemaVersion: 1;
  readonly updatedAt: string;
  readonly runs: readonly ContentMigrationHistoryRun[];
};

export type ContentMigrationListEntry = {
  readonly id: string;
  readonly latestVersion: number;
  readonly status: ContentMigrationStatus;
  readonly appliedVersion?: number;
  readonly definitionMatches: boolean;
  readonly pendingVersions: readonly number[];
};

export const CONTENT_MIGRATION_HISTORY_LIMIT = 100;

export class ContentMigrationStateError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ContentMigrationStateError";
    this.code = code;
  }
}

export const STATUSES: readonly ContentMigrationStatus[] = [
  "pending",
  "planned",
  "applying",
  "applied",
  "failed",
  "recovery-required",
  "rolled-back",
  "superseded",
];

export const HISTORY_STATUSES: readonly ContentMigrationHistoryStatus[] = [
  "success",
  "failure",
  "rolled-back",
];

export const RECOVERY_STATES: readonly ContentMigrationRecoveryState[] = [
  "none",
  "required",
  "recovered",
];

export function fail(code: string, message: string): never {
  throw new ContentMigrationStateError(code, message);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readString(
  value: unknown,
  field: string,
  optional = false,
): string | undefined {
  if (value === undefined && optional) return undefined;
  if (typeof value !== "string" || value.length === 0)
    fail("invalid-state", `${field} must be a non-empty string.`);
  return value;
}

export function readNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0)
    fail("invalid-state", `${field} must be a non-negative integer.`);
  return value;
}

export function readTimestamp(
  value: unknown,
  field: string,
  optional = false,
): string | undefined {
  const result = readString(value, field, optional);
  if (result === undefined) return undefined;
  if (Number.isNaN(Date.parse(result)))
    fail("invalid-state", `${field} must be an ISO timestamp.`);
  return result;
}

export function sanitizeContentMigrationPath(value: string): string {
  const normalized = value.replaceAll("\\", "/");
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:/.test(normalized) ||
    normalized
      .split("/")
      .some((part) => part === "" || part === "." || part === "..")
  )
    fail("invalid-path", `Unsafe migration path: ${value}`);
  return normalized;
}

export function sanitizeContentMigrationPaths(
  values: readonly string[],
): readonly string[] {
  return [...new Set(values.map(sanitizeContentMigrationPath))].toSorted(
    (left, right) => left.localeCompare(right),
  );
}

export function readStatus(value: unknown): ContentMigrationStatus {
  if (typeof value !== "string" || !STATUSES.includes(value as never))
    fail("invalid-state", `Unknown migration status: ${String(value)}`);
  return value as ContentMigrationStatus;
}

export function readHistoryStatus(
  value: unknown,
): ContentMigrationHistoryStatus {
  if (typeof value !== "string" || !HISTORY_STATUSES.includes(value as never))
    fail("invalid-state", `Unknown history status: ${String(value)}`);
  return value as ContentMigrationHistoryStatus;
}

export function readRecoveryState(
  value: unknown,
): ContentMigrationRecoveryState {
  if (typeof value !== "string" || !RECOVERY_STATES.includes(value as never))
    fail("invalid-state", `Unknown recovery state: ${String(value)}`);
  return value as ContentMigrationRecoveryState;
}

export function readPaths(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string"))
    fail("invalid-state", "changedPaths must be an array of strings.");
  return sanitizeContentMigrationPaths(value);
}
