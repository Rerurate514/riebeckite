import type {
  HostingProvider,
  PublicationRunTrigger,
  PublicationWorkflowMode,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "../application_root.js";
import { createPublishContext } from "./publish_context.js";
import { runApprove, runRevoke } from "./publish_decision.js";
import { runGate, runRecord } from "./publish_gate_record.js";
import {
  printJson,
  printPlan,
  printStatus,
  printValidation,
} from "./publish_print.js";
import { runPublication } from "./publish_run.js";

export type PublishAction =
  | "plan"
  | "status"
  | "validate"
  | "run"
  | "approve"
  | "revoke"
  | "record"
  | "gate";

export type PublishCommandOptions = {
  readonly action: PublishAction;
  readonly json: boolean;
  readonly at?: string;
  readonly provider?: HostingProvider;
  readonly approvals?: string;
  readonly stateFile?: string;
  readonly workflow?: PublicationWorkflowMode;
  readonly execute: boolean;
  readonly force: boolean;
  readonly trigger: PublicationRunTrigger;
  readonly slugs: readonly string[];
  readonly all: boolean;
  readonly approvedBy?: string;
};

export async function runPublish(
  project: RiebeckiteProject,
  options: PublishCommandOptions,
): Promise<boolean> {
  if (options.action === "approve") return runApprove(project, options);
  if (options.action === "revoke") return runRevoke(project, options);
  if (options.action === "record") {
    return runRecord(project, options);
  }
  if (options.action === "gate") {
    return runGate(project, options);
  }

  const context = await createPublishContext(project, options);
  if (options.action === "plan") {
    if (options.json) printJson(context, "plan", project);
    else printPlan(context);
    return context.plan.validation.ok;
  }
  if (options.action === "status") {
    if (options.json) printJson(context, "status", project);
    else printStatus(context, project);
    return true;
  }
  if (options.action === "validate") {
    if (options.json) printJson(context, "validate", project);
    else printValidation(context);
    return (
      context.plan.action !== "blocked" &&
      context.plan.validation.ok &&
      !context.artifactIssues.some((issue) => issue.severity === "error")
    );
  }
  return runPublication(project, options, context);
}

export { resolvePublicationApprovalPath } from "../publication/state.js";
