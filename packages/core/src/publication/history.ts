import {
  type PublicationSnapshot,
  parsePublicationSnapshot,
} from "./entries.js";
import type { HostingProvider } from "./hosting.js";
import type { PublicationChanges, PublicationPlan } from "./planner.js";

export const PUBLICATION_HISTORY_VERSION = 1;
export const PUBLICATION_HISTORY_LIMIT = 50;

export type PublicationRunStatus =
  | "planned"
  | "building"
  | "built"
  | "deploying"
  | "deployed"
  | "skipped"
  | "failed";

export type PublicationRunTrigger = "manual" | "scheduled" | "ci" | "cli";

export type PublicationRunStep = {
  readonly status: "skipped" | "succeeded" | "failed";
  readonly durationMs?: number;
  readonly failure?: string;
};

export type PublicationRunRecord = {
  readonly id: string;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly status: PublicationRunStatus;
  readonly trigger: PublicationRunTrigger;
  readonly dryRun: boolean;
  readonly planFingerprint: string;
  readonly artifactFingerprint?: string;
  readonly provider?: HostingProvider;
  readonly workflow: PublicationPlan["workflow"];
  readonly action: PublicationPlan["action"];
  readonly build?: PublicationRunStep;
  readonly deploy?: PublicationRunStep;
  readonly changes: PublicationChanges;
  readonly nextPublicationAt?: string;
  readonly error?: string;
};

export type PublicationHistory = {
  readonly version: typeof PUBLICATION_HISTORY_VERSION;
  readonly runs: readonly PublicationRunRecord[];
  readonly lastSuccess?: PublicationSnapshot;
};

export function emptyPublicationHistory(): PublicationHistory {
  return { version: PUBLICATION_HISTORY_VERSION, runs: [] };
}

export function appendPublicationRun(
  history: PublicationHistory,
  run: PublicationRunRecord,
  limit = PUBLICATION_HISTORY_LIMIT,
): PublicationHistory {
  return {
    ...history,
    runs: [run, ...history.runs].slice(0, Math.max(1, limit)),
  };
}

export function replacePublicationRun(
  history: PublicationHistory,
  run: PublicationRunRecord,
): PublicationHistory {
  return {
    ...history,
    runs: history.runs.map((existing) =>
      existing.id === run.id ? run : existing,
    ),
  };
}

export function recordPublicationSuccess(
  history: PublicationHistory,
  snapshot: PublicationSnapshot,
): PublicationHistory {
  return { ...history, lastSuccess: snapshot };
}

export function parsePublicationHistory(
  value: unknown,
): PublicationHistory | undefined {
  if (!isRecord(value) || value.version !== PUBLICATION_HISTORY_VERSION) {
    return undefined;
  }
  if (!Array.isArray(value.runs)) return undefined;
  const runs: PublicationRunRecord[] = [];
  for (const run of value.runs) {
    const parsed = parseRunRecord(run);
    if (parsed !== undefined) runs.push(parsed);
  }
  if (value.lastSuccess !== undefined) {
    const snapshot = parsePublicationSnapshot(value.lastSuccess);
    if (snapshot === undefined) {
      return { version: PUBLICATION_HISTORY_VERSION, runs };
    }
  }
  return {
    version: PUBLICATION_HISTORY_VERSION,
    runs,
    ...(value.lastSuccess === undefined
      ? {}
      : { lastSuccess: value.lastSuccess as PublicationSnapshot }),
  };
}

function parseRunRecord(value: unknown): PublicationRunRecord | undefined {
  if (!isRecord(value)) return undefined;
  if (
    typeof value.id !== "string" ||
    typeof value.startedAt !== "string" ||
    (value.finishedAt !== undefined && typeof value.finishedAt !== "string") ||
    !isRunStatus(value.status) ||
    !isTrigger(value.trigger) ||
    typeof value.dryRun !== "boolean" ||
    typeof value.planFingerprint !== "string" ||
    !isWorkflowState(value.workflow) ||
    !isAction(value.action) ||
    !isChanges(value.changes)
  ) {
    return undefined;
  }
  return value as unknown as PublicationRunRecord;
}

function isRunStatus(value: unknown): value is PublicationRunStatus {
  return (
    value === "planned" ||
    value === "building" ||
    value === "built" ||
    value === "deploying" ||
    value === "deployed" ||
    value === "skipped" ||
    value === "failed"
  );
}

function isTrigger(value: unknown): value is PublicationRunTrigger {
  return (
    value === "manual" ||
    value === "scheduled" ||
    value === "ci" ||
    value === "cli"
  );
}

function isWorkflowState(value: unknown): boolean {
  return (
    value === "draft" ||
    value === "review" ||
    value === "approved" ||
    value === "published" ||
    value === "retracted"
  );
}

function isAction(value: unknown): boolean {
  return (
    value === "none" || value === "build-and-deploy" || value === "blocked"
  );
}

function isChanges(value: unknown): boolean {
  if (!isRecord(value) || typeof value.detected !== "boolean") return false;
  return ["added", "changed", "removed", "unchanged"].every(
    (key) =>
      Array.isArray(value[key]) &&
      (value[key] as unknown[]).every((item) => typeof item === "string"),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
