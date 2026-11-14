import fs from "node:fs/promises";
import type {
  ContentMutationOperation,
  ContentMutationPlan,
} from "@riebeckite/core";
import { FileSystemContentMutation } from "@riebeckite/node";
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

export function createBridgeMutationStore(
  contentRoot: string,
  approvalSecret: string,
  formats?: {
    readonly isContentPath: (path: string) => boolean;
    readonly toSlug: (path: string) => string | undefined;
  },
): BridgeMutationStore {
  const mutation = new FileSystemContentMutation(contentRoot, formats);
  return {
    async plan(operations) {
      const plan = await mutation.plan(operations);
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
