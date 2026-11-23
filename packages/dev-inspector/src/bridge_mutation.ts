import fs from "node:fs/promises";
import type {
  ContentMutationOperation,
  ContentMutationPlan,
} from "@riebeckite/core";
import {
  approvalPath,
  claimApproval,
  decode,
  encode,
  hashPlan,
  planPath,
  readApproval,
  readPlan,
  rejected,
  sign,
  validSignature,
  writeJson,
} from "./bridge_mutation_storage.js";

const approvalLifetimeMs = 5 * 60 * 1000;

export type BridgeMutationPlanReview = {
  readonly id: string;
  readonly hash: string;
  readonly changes: ContentMutationPlan["changes"];
  readonly warnings: ContentMutationPlan["warnings"];
};

export type BridgeMutationStore = {
  plan(
    operations: readonly ContentMutationOperation[],
  ): Promise<ContentMutationPlan>;
  apply(planId: string): Promise<unknown>;
};

export type BridgeMutationInspection = {
  readonly status: "ready";
  readonly id: string;
  readonly hash: string;
  readonly changes: readonly {
    readonly path: string;
    readonly kind: "create" | "update" | "delete";
    readonly beforeFingerprint: string | null;
    readonly afterFingerprint: string | null;
    readonly bytes: number;
  }[];
  readonly warnings: ContentMutationPlan["warnings"];
  readonly conflicts: ContentMutationPlan["conflicts"];
  readonly risk: "safe" | "review" | "destructive" | "blocked";
  readonly approval: {
    readonly status: "required" | "ready" | "expired" | "used";
    readonly expiresAt: string | null;
  };
};

export async function createBridgeMutationStore(
  contentRoot: string,
  approvalSecret: string,
  formats?: {
    readonly isContentPath: (path: string) => boolean;
    readonly toSlug: (path: string) => string | undefined;
  },
  isMutationPathAllowed?: (path: string) => boolean,
): Promise<BridgeMutationStore> {
  const { FileSystemContentMutation } = await import("@riebeckite/node");
  const mutation = new FileSystemContentMutation(contentRoot, formats);
  return {
    async plan(operations) {
      const plan = restrictPlan(
        await mutation.plan(operations),
        isMutationPathAllowed,
      );
      const stored = { hash: hashPlan(plan), plan: encode(plan) };
      await writeJson(planPath(contentRoot, plan.id), stored);
      return plan;
    },
    async apply(planId) {
      const stored = await readPlan(contentRoot, planId);
      const plan = stored
        ? (decode(stored.plan) as ContentMutationPlan)
        : undefined;
      if (
        !stored ||
        !plan ||
        plan.id !== planId ||
        hashPlan(plan) !== stored.hash
      )
        return rejected(planId, "plan-not-found");
      if (!mutationPathsAllowed(plan, isMutationPathAllowed))
        return rejected(planId, "mutation-policy");
      const approval = await readApproval(contentRoot, planId);
      if (!approval) return rejected(planId, "approval-required");
      if (approval.planId !== planId || approval.planHash !== stored.hash)
        return rejected(planId, "approval-invalid");
      if (approval.used) return rejected(planId, "approval-used");
      if (approval.expiresAt <= Date.now())
        return rejected(planId, "approval-expired");
      if (!validSignature(approval, approvalSecret))
        return rejected(planId, "approval-invalid");
      if (!(await claimApproval(contentRoot, planId)))
        return rejected(planId, "approval-claim-conflict");
      await writeJson(approvalPath(contentRoot, planId), {
        ...approval,
        used: true,
      });
      return mutation.apply(plan);
    },
  };
}

export async function inspectBridgeMutationPlan(
  contentRoot: string,
  planId: string,
): Promise<BridgeMutationInspection | undefined> {
  const stored = await readPlan(contentRoot, planId);
  if (!stored) return undefined;
  const plan = decode(stored.plan) as ContentMutationPlan;
  if (plan.id !== planId || hashPlan(plan) !== stored.hash) return undefined;
  const approval = await readApproval(contentRoot, planId);
  const approvalStatus = !approval
    ? "required"
    : approval.used
      ? "used"
      : approval.expiresAt <= Date.now()
        ? "expired"
        : "ready";
  return {
    status: "ready",
    id: plan.id,
    hash: stored.hash,
    changes: plan.changes.map((change) => ({
      path: change.path,
      kind:
        change.beforeFingerprint === null
          ? "create"
          : change.afterFingerprint === null
            ? "delete"
            : "update",
      beforeFingerprint: change.beforeFingerprint,
      afterFingerprint: change.afterFingerprint,
      bytes: change.content?.byteLength ?? 0,
    })),
    warnings: plan.warnings,
    conflicts: plan.conflicts,
    risk: mutationRisk(plan),
    approval: {
      status: approvalStatus,
      expiresAt: approval ? new Date(approval.expiresAt).toISOString() : null,
    },
  };
}

export async function validateBridgeMutation(
  contentRoot: string,
  operations: readonly ContentMutationOperation[],
  formats?: {
    readonly isContentPath: (path: string) => boolean;
    readonly toSlug: (path: string) => string | undefined;
  },
  isMutationPathAllowed?: (path: string) => boolean,
): Promise<ContentMutationPlan> {
  const { FileSystemContentMutation } = await import("@riebeckite/node");
  return restrictPlan(
    await new FileSystemContentMutation(contentRoot, formats).plan(operations),
    isMutationPathAllowed,
  );
}

export async function reviewBridgeMutationPlan(
  contentRoot: string,
  planId: string,
): Promise<BridgeMutationPlanReview | undefined> {
  const stored = await readPlan(contentRoot, planId);
  if (!stored) return undefined;
  const plan = decode(stored.plan) as ContentMutationPlan;
  if (plan.id !== planId || hashPlan(plan) !== stored.hash) return undefined;
  return {
    id: plan.id,
    hash: stored.hash,
    changes: plan.changes,
    warnings: plan.warnings,
  };
}

function mutationRisk(
  plan: ContentMutationPlan,
): BridgeMutationInspection["risk"] {
  if (plan.conflicts.some((conflict) => conflict.severity === "error"))
    return "blocked";
  if (plan.changes.some((change) => change.afterFingerprint === null))
    return "destructive";
  if (
    flattenOperations(plan.operations).some(
      (operation) =>
        operation.kind === "frontmatter" ||
        operation.kind === "move" ||
        operation.kind === "rename" ||
        operation.kind === "asset-move",
    )
  )
    return "review";
  return "safe";
}

function flattenOperations(
  operations: ContentMutationPlan["operations"],
): Exclude<ContentMutationPlan["operations"][number], { kind: "batch" }>[] {
  return operations.flatMap((operation) =>
    operation.kind === "batch"
      ? flattenOperations(operation.operations)
      : [operation],
  );
}

function restrictPlan(
  plan: ContentMutationPlan,
  isMutationPathAllowed: ((path: string) => boolean) | undefined,
): ContentMutationPlan {
  if (mutationPathsAllowed(plan, isMutationPathAllowed)) return plan;
  return {
    ...plan,
    conflicts: [
      ...plan.conflicts,
      ...mutationPaths(plan.operations)
        .filter((path) => !isMutationPathAllowed?.(path))
        .map((path) => ({
          severity: "error" as const,
          code: "mutation-policy",
          path,
          message: "The mutation policy does not allow this path.",
        })),
    ],
  };
}

function mutationPathsAllowed(
  plan: ContentMutationPlan,
  isMutationPathAllowed: ((path: string) => boolean) | undefined,
): boolean {
  return (
    !isMutationPathAllowed ||
    mutationPaths(plan.operations).every(isMutationPathAllowed)
  );
}

function mutationPaths(
  operations: ContentMutationPlan["operations"],
): readonly string[] {
  return flattenOperations(operations).flatMap((operation) =>
    "path" in operation ? [operation.path] : [operation.from, operation.to],
  );
}

export async function approveBridgeMutationPlan(
  contentRoot: string,
  planId: string,
  approvalSecret: string,
): Promise<{ expiresAt: string } | undefined> {
  const review = await reviewBridgeMutationPlan(contentRoot, planId);
  if (!review) return undefined;
  const expiresAt = Date.now() + approvalLifetimeMs;
  const unsigned = {
    planId,
    planHash: review.hash,
    expiresAt,
    used: false,
  };
  const approval = { ...unsigned, signature: sign(unsigned, approvalSecret) };
  try {
    await fs.access(approvalPath(contentRoot, planId));
    return undefined;
  } catch {
    await writeJson(approvalPath(contentRoot, planId), approval);
    return { expiresAt: new Date(expiresAt).toISOString() };
  }
}

export function isMutationOperations(
  value: unknown,
): value is readonly ContentMutationOperation[] {
  return Array.isArray(value) && value.length > 0;
}
