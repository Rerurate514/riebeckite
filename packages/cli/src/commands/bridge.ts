import { createInterface } from "node:readline/promises";
import { CliUsageError } from "@riebeckite/core";
import {
  approveBridgeMutationPlan,
  reviewBridgeMutationPlan,
} from "@riebeckite/dev-inspector";
import type { RiebeckiteProject } from "../application_root.js";

export async function runBridgeApproval(
  project: RiebeckiteProject,
  planId: string,
): Promise<boolean> {
  const secret = process.env.RIEBECKITE_BRIDGE_MUTATION_APPROVAL_TOKEN;
  if (!secret || secret.length < 32)
    throw new CliUsageError(
      "RIEBECKITE_BRIDGE_MUTATION_APPROVAL_TOKEN must be at least 32 characters.",
    );
  if (process.stdin.isTTY !== true || process.stdout.isTTY !== true)
    throw new CliUsageError(
      "Bridge approval requires an interactive terminal.",
    );
  const review = await reviewBridgeMutationPlan(project.contentRoot, planId);
  if (!review)
    throw new CliUsageError(
      "The Bridge mutation plan is unavailable or invalid.",
    );
  process.stdout.write(`Plan ${review.id}\n`);
  for (const change of review.changes)
    process.stdout.write(
      `  ${change.beforeFingerprint === null ? "create" : change.afterFingerprint === null ? "delete" : "update"} ${change.path}\n`,
    );
  for (const warning of review.warnings)
    process.stdout.write(`Warning: ${warning.message}\n`);
  if (!(await confirm("Approve this Bridge mutation? [y/N]: "))) return false;
  const approval = await approveBridgeMutationPlan(
    project.contentRoot,
    planId,
    secret,
  );
  if (!approval)
    throw new CliUsageError(
      "The Bridge mutation plan is unavailable or invalid.",
    );
  process.stdout.write(`Approved until ${approval.expiresAt}.\n`);
  return true;
}

async function confirm(message: string): Promise<boolean> {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const answer = (await readline.question(message)).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    readline.close();
  }
}
