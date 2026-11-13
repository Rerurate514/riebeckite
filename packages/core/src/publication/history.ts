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
  const lastSuccess =
    value.lastSuccess === undefined
      ? undefined
      : parsePublicationSnapshot(value.lastSuccess);
  if (value.lastSuccess !== undefined && lastSuccess === undefined) {
    return { version: PUBLICATION_HISTORY_VERSION, runs };
  }
  return {
    version: PUBLICATION_HISTORY_VERSION,
    runs,
    ...(lastSuccess === undefined ? {} : { lastSuccess }),
  };
}

function parseRunRecord(value: unknown): PublicationRunRecord | undefined {
  if (!isRecord(value)) return undefined;
  const {
    id,
    startedAt,
    finishedAt,
    status,
    trigger,
    dryRun,
    planFingerprint,
    artifactFingerprint,
    provider,
    workflow,
    action,
    build,
    deploy,
    changes,
    nextPublicationAt,
    error,
  } = value;
  if (typeof id !== "string") return undefined;
  if (typeof startedAt !== "string") return undefined;
  if (!isOptionalString(finishedAt)) return undefined;
  if (!isRunStatus(status)) return undefined;
  if (!isTrigger(trigger)) return undefined;
  if (typeof dryRun !== "boolean") return undefined;
  if (typeof planFingerprint !== "string") return undefined;
  if (!isOptionalString(artifactFingerprint)) return undefined;
  if (!isOptionalHostingProvider(provider)) return undefined;
  if (!isWorkflowState(workflow)) return undefined;
  if (!isAction(action)) return undefined;
  if (!isOptionalRunStep(build)) return undefined;
  if (!isOptionalRunStep(deploy)) return undefined;
  if (!isChanges(changes)) return undefined;
  if (!isOptionalString(nextPublicationAt)) return undefined;
  if (!isOptionalString(error)) return undefined;
  return {
    id,
    startedAt,
    ...(finishedAt === undefined ? {} : { finishedAt }),
    status,
    trigger,
    dryRun,
    planFingerprint,
    ...(artifactFingerprint === undefined ? {} : { artifactFingerprint }),
    ...(provider === undefined ? {} : { provider }),
    workflow,
    action,
    ...(build === undefined ? {} : { build }),
    ...(deploy === undefined ? {} : { deploy }),
    changes,
    ...(nextPublicationAt === undefined ? {} : { nextPublicationAt }),
    ...(error === undefined ? {} : { error }),
  };
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
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

function isHostingProvider(value: unknown): value is HostingProvider {
  return (
    value === "github-pages" ||
    value === "cloudflare-workers" ||
    value === "cloudflare-pages" ||
    value === "netlify" ||
    value === "vercel"
  );
}

function isOptionalHostingProvider(
  value: unknown,
): value is HostingProvider | undefined {
  return value === undefined || isHostingProvider(value);
}

function isRunStep(value: unknown): value is PublicationRunStep {
  return (
    isRecord(value) &&
    (value.status === "skipped" ||
      value.status === "succeeded" ||
      value.status === "failed") &&
    (value.durationMs === undefined || typeof value.durationMs === "number") &&
    (value.failure === undefined || typeof value.failure === "string")
  );
}

function isOptionalRunStep(
  value: unknown,
): value is PublicationRunStep | undefined {
  return value === undefined || isRunStep(value);
}

function isWorkflowState(value: unknown): value is PublicationPlan["workflow"] {
  return (
    value === "draft" ||
    value === "review" ||
    value === "approved" ||
    value === "published" ||
    value === "retracted"
  );
}

function isAction(value: unknown): value is PublicationPlan["action"] {
  return (
    value === "none" || value === "build-and-deploy" || value === "blocked"
  );
}

function isChanges(value: unknown): value is PublicationChanges {
  if (!isRecord(value) || typeof value.detected !== "boolean") return false;
  return (["added", "changed", "removed", "unchanged"] as const).every((key) =>
    isStringArray(value[key]),
  );
}

function isStringArray(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
