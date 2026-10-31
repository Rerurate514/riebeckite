import type { PublicationEntry } from "./entries.js";

export const PUBLICATION_APPROVALS_VERSION = 1;

/**
 * `direct` publishes any public or unlisted note without a review step.
 * `approved` requires an approval record whose content fingerprint still
 * matches the note. Personal sites keep the default `direct` workflow.
 */
export type PublicationWorkflowMode = "direct" | "approved";

export type PublicationWorkflowState =
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "retracted";

export type PublicationApproval = {
  readonly slug: string;
  readonly contentFingerprint: string;
  readonly approvedAt: string;
  readonly approvedBy?: string;
};

export type PublicationApprovals = {
  readonly version: typeof PUBLICATION_APPROVALS_VERSION;
  readonly approvals: Readonly<Record<string, PublicationApproval>>;
};

export type PublicationApprovalState = "not-required" | "pending" | "approved";

export function emptyPublicationApprovals(): PublicationApprovals {
  return { version: PUBLICATION_APPROVALS_VERSION, approvals: {} };
}

export function resolveApprovalState(
  entry: PublicationEntry,
  approvals: PublicationApprovals,
  mode: PublicationWorkflowMode,
): PublicationApprovalState {
  if (entry.visibility === "draft") return "not-required";
  if (mode === "direct") return "not-required";
  return isApprovalCurrent(approvals.approvals[entry.slug], entry)
    ? "approved"
    : "pending";
}

export function isApprovalCurrent(
  approval: PublicationApproval | undefined,
  entry: PublicationEntry,
): boolean {
  return (
    approval !== undefined &&
    approval.slug === entry.slug &&
    approval.contentFingerprint === entry.contentFingerprint
  );
}

export function createApproval(
  entry: PublicationEntry,
  options: { approvedAt?: Date | string; approvedBy?: string } = {},
): PublicationApproval {
  return {
    slug: entry.slug,
    contentFingerprint: entry.contentFingerprint,
    approvedAt: toIso(options.approvedAt ?? new Date()),
    ...(options.approvedBy ? { approvedBy: options.approvedBy } : {}),
  };
}

export function approveEntries(
  approvals: PublicationApprovals,
  entries: readonly PublicationEntry[],
  options: { approvedAt?: Date | string; approvedBy?: string } = {},
): PublicationApprovals {
  const next = { ...approvals.approvals };
  for (const entry of entries) {
    next[entry.slug] = createApproval(entry, options);
  }
  return { version: PUBLICATION_APPROVALS_VERSION, approvals: next };
}

export function pendingApprovalEntries(
  entries: readonly PublicationEntry[],
  approvals: PublicationApprovals,
  mode: PublicationWorkflowMode,
): PublicationEntry[] {
  return entries.filter(
    (entry) => resolveApprovalState(entry, approvals, mode) === "pending",
  );
}

export function resolvePublicationWorkflowState(input: {
  readonly routableEntries: readonly PublicationEntry[];
  readonly pendingApprovals: readonly PublicationEntry[];
  readonly changesDetected: boolean;
  readonly retracted: readonly string[];
  readonly retractedOnly?: boolean;
}): PublicationWorkflowState {
  if (input.retractedOnly && input.retracted.length > 0) return "retracted";
  if (input.routableEntries.length === 0) return "draft";
  if (input.pendingApprovals.length > 0) return "review";
  if (input.changesDetected) return "approved";
  return "published";
}

export function parsePublicationApprovals(
  value: unknown,
): PublicationApprovals | undefined {
  if (!isRecord(value) || value.version !== PUBLICATION_APPROVALS_VERSION) {
    return undefined;
  }
  if (!isRecord(value.approvals)) return undefined;
  const approvals: Record<string, PublicationApproval> = {};
  for (const [slug, candidate] of Object.entries(value.approvals)) {
    if (!isRecord(candidate)) return undefined;
    const approvedBy = candidate.approvedBy;
    if (approvedBy !== undefined && typeof approvedBy !== "string") {
      return undefined;
    }
    if (
      typeof candidate.slug !== "string" ||
      candidate.slug !== slug ||
      typeof candidate.contentFingerprint !== "string" ||
      typeof candidate.approvedAt !== "string" ||
      Number.isNaN(Date.parse(candidate.approvedAt))
    ) {
      return undefined;
    }
    approvals[slug] = {
      slug,
      contentFingerprint: candidate.contentFingerprint,
      approvedAt: candidate.approvedAt,
      ...(typeof approvedBy === "string" ? { approvedBy } : {}),
    };
  }
  return { version: PUBLICATION_APPROVALS_VERSION, approvals };
}

export function toIso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid publication date "${String(value)}".`);
  }
  return date.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
