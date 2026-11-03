import crypto from "node:crypto";
import type {
  ContentMutationOperation,
  ContentMutationPlan,
} from "@riebeckite/core";
import { FileSystemContentMutation } from "@riebeckite/node";

const approvalLifetimeMs = 5 * 60 * 1000;

export type BridgeMutationStore = {
  plan(
    operations: readonly ContentMutationOperation[],
  ): Promise<ContentMutationPlan>;
  approve(
    planId: string,
  ): { approvalId: string; expiresAt: string } | undefined;
  apply(planId: string, approvalId: string): Promise<unknown>;
};

export function createBridgeMutationStore(
  contentRoot: string,
): BridgeMutationStore {
  const mutation = new FileSystemContentMutation(contentRoot);
  const plans = new Map<string, ContentMutationPlan>();
  const approvals = new Map<
    string,
    { planId: string; expiresAt: number; used: boolean }
  >();
  return {
    async plan(operations) {
      const plan = await mutation.plan(operations);
      plans.set(plan.id, plan);
      return plan;
    },
    approve(planId) {
      const plan = plans.get(planId);
      if (!plan || plan.conflicts.length > 0) return undefined;
      const approvalId = crypto.randomUUID();
      const expiresAt = Date.now() + approvalLifetimeMs;
      approvals.set(approvalId, { planId, expiresAt, used: false });
      return { approvalId, expiresAt: new Date(expiresAt).toISOString() };
    },
    async apply(planId, approvalId) {
      const approval = approvals.get(approvalId);
      if (
        !approval ||
        approval.planId !== planId ||
        approval.used ||
        approval.expiresAt <= Date.now()
      )
        return {
          planId,
          applied: false,
          conflicts: [{ code: "approval-required" }],
        };
      const plan = plans.get(planId);
      if (!plan)
        return {
          planId,
          applied: false,
          conflicts: [{ code: "plan-not-found" }],
        };
      approval.used = true;
      return mutation.apply(plan);
    },
  };
}

export function isMutationOperations(
  value: unknown,
): value is readonly ContentMutationOperation[] {
  return Array.isArray(value) && value.length > 0;
}
