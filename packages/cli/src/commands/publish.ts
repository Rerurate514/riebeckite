import crypto from "node:crypto";
import {
  appendPublicationRun,
  approveEntries,
  createPublicationPlan,
  createPublicationSnapshot,
  describeSchedulerGuarantee,
  type HostingProvider,
  NoopLogger,
  NoopTracer,
  type PublicationApprovals,
  type PublicationArtifactState,
  type PublicationHistory,
  type PublicationPlan,
  type PublicationRunRecord,
  type PublicationRunTrigger,
  type PublicationWorkflowMode,
  publicationEntriesFromManifest,
  publicationRedirectsFromManifest,
  recordPublicationSuccess,
  resolvePublishingBuildTime,
  validatePublicationArtifact,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "../application_root.js";
import {
  readPublicationArtifact,
  resolvePublicationOutputDirectory,
} from "../publication/artifact.js";
import {
  detectProjectHostingProvider,
  executeHostingDeployment,
  hostingCapabilities,
  hostingEnvironment,
  planHostingDeployment,
} from "../publication/hosting.js";
import { loadPublicationManifest } from "../publication/manifest.js";
import {
  acquirePublicationLock,
  PublicationStateError,
  readPublicationApprovals,
  readPublicationHistory,
  releasePublicationLock,
  resolvePublicationHistoryPath,
  writePublicationApprovals,
  writePublicationHistory,
} from "../publication/state.js";
import { runBuild } from "./build.js";

export type PublishAction =
  | "plan"
  | "status"
  | "validate"
  | "run"
  | "approve"
  | "record";

export type PublishCommandOptions = {
  readonly action: PublishAction;
  readonly json: boolean;
  readonly at?: string;
  readonly provider?: HostingProvider;
  readonly approvals?: string;
  readonly workflow: PublicationWorkflowMode;
  readonly execute: boolean;
  readonly force: boolean;
  readonly trigger: PublicationRunTrigger;
  readonly slugs: readonly string[];
  readonly all: boolean;
  readonly approvedBy?: string;
};

type PublishContext = {
  readonly buildTime: Date;
  readonly plan: PublicationPlan;
  readonly provider?: HostingProvider;
  readonly artifact: PublicationArtifactState;
  readonly history: PublicationHistory;
  readonly approvals: PublicationApprovals;
  readonly approvalFile: string;
  readonly artifactIssues: ReturnType<typeof validatePublicationArtifact>;
};

export async function runPublish(
  project: RiebeckiteProject,
  options: PublishCommandOptions,
): Promise<boolean> {
  if (options.action === "approve") return runApprove(project, options);
  if (options.action === "record") {
    return runRecord(project, options);
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
      context.plan.validation.ok &&
      !context.artifactIssues.some((issue) => issue.severity === "error")
    );
  }
  return runPublication(project, options, context);
}

async function createPublishContext(
  project: RiebeckiteProject,
  options: PublishCommandOptions,
): Promise<PublishContext> {
  const artifact = await readPublicationArtifact(project);
  const artifactBuildTime =
    (options.action === "validate" || options.action === "record") &&
    options.at === undefined &&
    artifact.markerCompletedAt !== undefined
      ? new Date(artifact.markerCompletedAt)
      : undefined;
  const buildTime =
    artifactBuildTime ??
    (options.at === undefined
      ? new Date()
      : resolvePublishingBuildTime(options.at));
  const manifest = await loadPublicationManifest(project, buildTime);
  const entries = publicationEntriesFromManifest(manifest);
  const redirects = publicationRedirectsFromManifest(manifest);
  const history = await readPublicationHistory(project);
  const { approvals, file } = await readPublicationApprovals(
    project,
    options.approvals,
  );
  const provider = await resolveProvider(project, options.provider);
  const plan = createPublicationPlan({
    buildTime,
    entries,
    redirects,
    ...(history.lastSuccess === undefined
      ? {}
      : { previous: history.lastSuccess }),
    approvals,
    workflow: options.workflow,
    ...(provider === undefined ? {} : { provider }),
    dryRun:
      options.action === "run" ? !options.execute : options.action !== "record",
    generatedAt: new Date(),
  });
  return {
    buildTime,
    plan,
    ...(provider === undefined ? {} : { provider }),
    artifact,
    history,
    approvals,
    approvalFile: file,
    artifactIssues: validatePublicationArtifact({
      plan,
      artifact,
      ...(provider === undefined ? {} : { provider }),
    }),
  };
}

async function runPublication(
  project: RiebeckiteProject,
  options: PublishCommandOptions,
  context: PublishContext,
): Promise<boolean> {
  const { plan } = context;
  const dryRun = !options.execute;
  if (plan.action === "blocked") {
    if (options.json) printJson(context, "run", project);
    else printValidation(context);
    return false;
  }

  const artifactCurrent =
    context.artifact.markerPublicationFingerprint ===
    plan.publicationFingerprint;
  if (!plan.build && !options.force) {
    const skipped = createRun(plan, options, "skipped", dryRun);
    if (options.execute) {
      const lock = await acquirePublicationLock(
        project,
        plan.publicationFingerprint,
      );
      try {
        await writePublicationHistory(
          project,
          appendPublicationRun(await readPublicationHistory(project), skipped),
        );
      } finally {
        await releasePublicationLock(project, lock);
      }
    }
    if (options.json) printJson({ ...context, run: skipped }, "run", project);
    else console.log("Publication is up to date. Nothing to deploy.");
    return true;
  }

  if (dryRun) {
    const planned = createRun(plan, options, "planned", true);
    if (options.json) printJson({ ...context, run: planned }, "run", project);
    else printRunPlan(context, planned);
    return true;
  }

  if (context.provider === undefined) {
    throw new PublicationStateError(
      "Could not detect a hosting provider. Pass --provider <github-pages|cloudflare-workers|cloudflare-pages|netlify|vercel>.",
    );
  }

  const lock = await acquirePublicationLock(
    project,
    plan.publicationFingerprint,
  );
  let run = createRun(plan, options, "building", false);
  let history: PublicationHistory = context.history;
  try {
    history = appendPublicationRun(await readPublicationHistory(project), run);
    await writePublicationHistory(project, history);
    const buildStartedAt = Date.now();
    const staleArtifact = !artifactCurrent;
    await runBuild(project, {
      full: staleArtifact,
      publishingBuildTime: plan.buildTime,
      observability: {
        logger: new NoopLogger(),
        tracer: new NoopTracer(),
      },
    });
    run = {
      ...run,
      status: "built",
      build: { status: "succeeded", durationMs: Date.now() - buildStartedAt },
    };
    history = {
      ...history,
      runs: history.runs.map((record) => (record.id === run.id ? run : record)),
    };
    await writePublicationHistory(project, history);

    const artifact = await readPublicationArtifact(project);
    const artifactIssues = validatePublicationArtifact({
      plan,
      artifact,
      provider: context.provider,
    });
    const errors = artifactIssues.filter((issue) => issue.severity === "error");
    if (errors.length > 0) {
      throw new PublicationStateError(
        errors.map((issue) => issue.message).join(" "),
      );
    }

    const hostingPlan = await planHostingDeployment(project, context.provider);
    run = { ...run, status: "deploying" };
    history = replaceRun(history, run);
    const deployStartedAt = Date.now();
    const deployment = await executeHostingDeployment(
      project,
      context.provider,
      hostingPlan,
      artifact,
    );
    run = {
      ...run,
      status: deployment.confirmed ? "deployed" : "dispatched",
      finishedAt: new Date().toISOString(),
      artifactFingerprint: artifact.artifactFingerprint,
      deploy: { status: "succeeded", durationMs: Date.now() - deployStartedAt },
    };
    history = replaceRun(history, run);
    if (deployment.confirmed) {
      history = recordPublicationSuccess(
        history,
        createPublicationSnapshot(plan, {
          runId: run.id,
          artifactFingerprint: artifact.artifactFingerprint,
          provider: context.provider,
        }),
      );
    }
    await writePublicationHistory(project, history);
    if (options.json) printJson({ ...context, run }, "run", project);
    else {
      printRunResult(run, project);
      if (!deployment.confirmed) {
        console.log(
          "Deployment dispatched. Run `riebeckite publish record` after the workflow finishes to store the successful snapshot.",
        );
      }
    }
    return true;
  } catch (error) {
    run = {
      ...run,
      status: "failed",
      finishedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    };
    await writePublicationHistory(project, replaceRun(history, run));
    throw error;
  } finally {
    await releasePublicationLock(project, lock);
  }
}

async function runRecord(
  project: RiebeckiteProject,
  options: PublishCommandOptions,
): Promise<boolean> {
  const context = await createPublishContext(project, options);
  if (context.plan.action === "blocked") {
    if (options.json) printJson(context, "record", project);
    else printValidation(context);
    return false;
  }
  const errors = context.artifactIssues.filter(
    (issue) => issue.severity === "error",
  );
  if (errors.length > 0) {
    if (options.json) printJson(context, "record", project);
    else for (const issue of errors) console.log(issue.message);
    return false;
  }
  if (context.provider === undefined) {
    throw new PublicationStateError(
      "Could not detect the provider that performed the deployment. Pass --provider.",
    );
  }
  const run: PublicationRunRecord = {
    ...createRun(context.plan, options, "deployed", false),
    finishedAt: new Date().toISOString(),
    artifactFingerprint: context.artifact.artifactFingerprint,
    provider: context.provider,
    deploy: { status: "succeeded" },
  };
  const lock = await acquirePublicationLock(
    project,
    context.plan.publicationFingerprint,
  );
  let history: PublicationHistory;
  try {
    history = recordPublicationSuccess(
      appendPublicationRun(await readPublicationHistory(project), run),
      createPublicationSnapshot(context.plan, {
        runId: run.id,
        artifactFingerprint: context.artifact.artifactFingerprint,
        provider: context.provider,
      }),
    );
    await writePublicationHistory(project, history);
  } finally {
    await releasePublicationLock(project, lock);
  }
  if (options.json) printJson({ ...context, run }, "record", project);
  else {
    console.log("Deployment recorded.");
    printRunDetails(run, project);
  }
  return true;
}

async function runApprove(
  project: RiebeckiteProject,
  options: PublishCommandOptions,
): Promise<boolean> {
  const buildTime =
    options.at === undefined
      ? new Date()
      : resolvePublishingBuildTime(options.at);
  if (options.slugs.length === 0 && !options.all) {
    throw new PublicationStateError(
      "Pass one or more note slugs or --all to approve.",
    );
  }
  const manifest = await loadPublicationManifest(project, buildTime);
  const entries = publicationEntriesFromManifest(manifest).filter(
    (entry) => entry.visibility !== "draft",
  );
  const selected = options.all
    ? entries
    : entries.filter((entry) => options.slugs.includes(entry.slug));
  const missing = options.slugs.filter(
    (slug) => !entries.some((entry) => entry.slug === slug),
  );
  if (missing.length > 0) {
    throw new PublicationStateError(
      `Unknown or unpublished note(s): ${missing.join(", ")}.`,
    );
  }
  if (selected.length === 0) {
    throw new PublicationStateError("No notes matched the approval request.");
  }
  const { approvals } = await readPublicationApprovals(
    project,
    options.approvals,
  );
  const next = approveEntries(approvals, selected, {
    approvedAt: new Date(),
    ...(options.approvedBy === undefined
      ? {}
      : { approvedBy: options.approvedBy }),
  });
  const file = await writePublicationApprovals(
    project,
    next,
    options.approvals,
  );
  if (options.json) {
    console.log(
      JSON.stringify(
        {
          approved: selected.map((entry) => entry.slug),
          file,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`Approved ${selected.length} note(s):`);
    for (const entry of selected) console.log(`  ${entry.slug}`);
    console.log(`Approval records: ${file}`);
    console.log(
      "Commit this file if CI should trust the approval; Riebeckite never stores credentials in it.",
    );
  }
  return true;
}

async function resolveProvider(
  project: RiebeckiteProject,
  override: HostingProvider | undefined,
): Promise<HostingProvider | undefined> {
  return override ?? (await detectProjectHostingProvider(project));
}

function createRun(
  plan: PublicationPlan,
  options: PublishCommandOptions,
  status: PublicationRunRecord["status"],
  dryRun: boolean,
): PublicationRunRecord {
  return {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    ...(status === "planned" || status === "skipped" || status === "deployed"
      ? { finishedAt: new Date().toISOString() }
      : {}),
    status,
    trigger: options.trigger,
    dryRun,
    planFingerprint: plan.publicationFingerprint,
    ...(plan.provider === undefined ? {} : { provider: plan.provider }),
    workflow: plan.workflow,
    action: plan.action,
    changes: plan.changes,
    ...(plan.nextPublicationAt === undefined
      ? {}
      : { nextPublicationAt: plan.nextPublicationAt }),
  };
}

function replaceRun(
  history: PublicationHistory,
  run: PublicationRunRecord,
): PublicationHistory {
  return {
    ...history,
    runs: history.runs.map((record) => (record.id === run.id ? run : record)),
  };
}

function printJson(
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
        history: context.history,
        historyFile: resolvePublicationHistoryPath(project),
        ...(context.run === undefined ? {} : { run: context.run }),
      },
      null,
      2,
    ),
  );
}

function printPlan(context: PublishContext): void {
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

function printStatus(
  context: PublishContext,
  project: RiebeckiteProject,
): void {
  printPlan(context);
  const last = context.history.lastSuccess;
  console.log("");
  console.log("Publication status");
  if (last) {
    console.log(`  Last success: ${last.runId} at ${last.publishedAt}`);
    console.log(`  Published fingerprint: ${last.publicationFingerprint}`);
  } else {
    console.log("  Last success: none");
  }
  const latest = context.history.runs[0];
  console.log(
    `  Latest run: ${latest ? `${latest.status} (${latest.trigger}, ${latest.startedAt})` : "none"}`,
  );
  console.log(
    `  Artifact: ${context.artifact.exists ? "present" : "missing"}${context.artifact.markerPublicationFingerprint ? ` · marker ${context.artifact.markerPublicationFingerprint.slice(0, 12)}` : ""}`,
  );
  console.log(`  History: ${resolvePublicationHistoryPath(project)}`);
}

function printValidation(context: PublishContext): void {
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

function printRunPlan(
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

function printRunResult(
  run: PublicationRunRecord,
  project: RiebeckiteProject,
): void {
  console.log(`Publication ${run.status}.`);
  printRunDetails(run, project);
}

function printRunDetails(
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

function printChanges(plan: PublicationPlan): void {
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

function printIssues(context: PublishContext): void {
  for (const issue of context.plan.validation.issues) {
    console.log(`  ${issue.severity}: ${issue.message}`);
  }
  for (const issue of context.artifactIssues) {
    console.log(`  ${issue.severity}: ${issue.message}`);
  }
}

function formatAction(plan: PublicationPlan): string {
  if (plan.action === "blocked") return `blocked (${plan.reasons.join(", ")})`;
  if (plan.action === "build-and-deploy") {
    return `build and deploy (${plan.reasons.join(", ")})`;
  }
  return `none (${plan.reasons.join(", ")})`;
}

export { resolvePublicationApprovalPath } from "../publication/state.js";
