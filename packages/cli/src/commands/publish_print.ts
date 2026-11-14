import {
  describeSchedulerGuarantee,
  type PublicationPlan,
  type PublicationRunRecord,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "../application_root.js";
import { resolvePublicationOutputDirectory } from "../publication/artifact.js";
import {
  hostingCapabilities,
  hostingEnvironment,
} from "../publication/hosting.js";
import { resolvePublicationHistoryPath } from "../publication/state.js";
import type { PublishContext } from "./publish_context.js";

export function printJson(
  context: PublishContext & { readonly run?: PublicationRunRecord },
  command: string,
  project: RiebeckiteProject,
): void {
  const capabilities = context.provider
    ? hostingCapabilities(context.provider)
    : undefined;
  console.log(
    JSON.stringify(
      {
        command,
        plan: context.plan,
        provider: context.provider,
        capabilities,
        scheduler: describeSchedulerGuarantee(context.provider),
        requiredEnvironment: context.provider
          ? hostingEnvironment(context.provider)
          : [],
        artifact: context.artifact,
        artifactIssues: context.artifactIssues,
        approvalsFile: context.approvalFile,
        durableState: context.durableState,
        durableStateFile: context.stateFile,
        history: context.history,
        historyFile: resolvePublicationHistoryPath(project),
        ...(context.run === undefined ? {} : { run: context.run }),
      },
      null,
      2,
    ),
  );
}

export function printPlan(context: PublishContext): void {
  const { plan } = context;
  console.log("Publication plan");
  console.log(`  Build time: ${plan.buildTime}`);
  console.log(
    `  Targets: ${plan.targets.public.length} public · ${plan.targets.unlisted.length} unlisted · ${plan.targets.scheduled.length} scheduled · ${plan.targets.drafts.length} draft`,
  );
  console.log(
    `  Workflow: ${plan.workflow}${plan.approvals.required ? " (approval required)" : ""}`,
  );
  if (plan.approvals.pending.length > 0) {
    console.log(`  Awaiting approval: ${plan.approvals.pending.join(", ")}`);
  }
  if (plan.nextPublicationAt) {
    console.log(`  Next publication: ${plan.nextPublicationAt}`);
  }
  printChanges(plan);
  console.log(`  Action: ${formatAction(plan)}`);
  printIssues(context);
  if (context.provider) {
    console.log(`  Hosting: ${context.provider}`);
    console.log(`  ${describeSchedulerGuarantee(context.provider)}`);
  } else {
    console.log("  Hosting: not detected (local plan only)");
  }
}

export function printStatus(
  context: PublishContext,
  project: RiebeckiteProject,
): void {
  printPlan(context);
  const last = context.durableState.lastSuccess ?? context.history.lastSuccess;
  console.log("");
  console.log("Publication status");
  if (last) {
    console.log(`  Last success: ${last.runId} at ${last.publishedAt}`);
    console.log(`  Published fingerprint: ${last.publicationFingerprint}`);
  } else {
    console.log("  Last success: none");
  }
  console.log(
    `  Durable state: ${context.stateFile}${context.durableState.lastSuccess ? "" : " (snapshot missing)"}`,
  );
  const latest = context.history.runs[0];
  console.log(
    `  Latest run: ${latest ? `${latest.status} (${latest.trigger}, ${latest.startedAt})` : "none"}`,
  );
  console.log(
    `  Artifact: ${context.artifact.exists ? "present" : "missing"}${context.artifact.markerPublicationFingerprint ? ` · marker ${context.artifact.markerPublicationFingerprint.slice(0, 12)}` : ""}`,
  );
  console.log(`  History: ${resolvePublicationHistoryPath(project)}`);
}

export function printValidation(context: PublishContext): void {
  const errors = [
    ...context.plan.validation.issues,
    ...context.artifactIssues,
  ].filter((issue) => issue.severity === "error");
  const warnings = [
    ...context.plan.validation.issues,
    ...context.artifactIssues,
  ].filter((issue) => issue.severity === "warning");
  if (errors.length === 0 && warnings.length === 0) {
    console.log("Publication validation passed.");
    return;
  }
  for (const issue of [...errors, ...warnings]) {
    console.log(
      `${issue.severity.toUpperCase()} ${issue.code}: ${issue.message}`,
    );
  }
}

export function printRunPlan(
  context: PublishContext,
  run: PublicationRunRecord,
): void {
  console.log("Publication dry run");
  printPlan(context);
  console.log("");
  console.log("Would:");
  if (run.action === "build-and-deploy") {
    console.log("  build the site");
    console.log(`  deploy to ${context.provider ?? "(no detected provider)"}`);
  } else {
    console.log("  do nothing");
  }
  console.log("Run with --execute to perform the deployment.");
}

export function printRunResult(
  run: PublicationRunRecord,
  project: RiebeckiteProject,
): void {
  console.log(`Publication ${run.status}.`);
  printRunDetails(run, project);
}

export function printRunDetails(
  run: PublicationRunRecord,
  project: RiebeckiteProject,
): void {
  console.log(`  Run: ${run.id}`);
  console.log(`  Plan: ${run.planFingerprint}`);
  if (run.artifactFingerprint) {
    console.log(`  Artifact: ${run.artifactFingerprint}`);
  }
  if (run.error) console.log(`  Error: ${run.error}`);
  console.log(`  Output: ${resolvePublicationOutputDirectory(project)}`);
  console.log(`  History: ${resolvePublicationHistoryPath(project)}`);
}

export function printChanges(plan: PublicationPlan): void {
  const { changes } = plan;
  if (!changes.detected) {
    console.log("  Changes: none");
    return;
  }
  const parts = [
    changes.added.length > 0 ? `+${changes.added.join(",")}` : undefined,
    changes.changed.length > 0 ? `~${changes.changed.join(",")}` : undefined,
    changes.removed.length > 0 ? `-${changes.removed.join(",")}` : undefined,
  ].filter((part): part is string => part !== undefined);
  console.log(`  Changes: ${parts.join(" ")}`);
}

export function printIssues(context: PublishContext): void {
  for (const issue of context.plan.validation.issues) {
    console.log(`  ${issue.severity}: ${issue.message}`);
  }
  for (const issue of context.artifactIssues) {
    console.log(`  ${issue.severity}: ${issue.message}`);
  }
}

export function formatAction(plan: PublicationPlan): string {
  if (plan.action === "blocked") return `blocked (${plan.reasons.join(", ")})`;
  if (plan.action === "build-and-deploy") {
    return `build and deploy (${plan.reasons.join(", ")})`;
  }
  return `none (${plan.reasons.join(", ")})`;
}
