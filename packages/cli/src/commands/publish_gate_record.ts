import {
  appendPublicationRun,
  createPublicationSnapshot,
  type PublicationHistory,
  type PublicationRunRecord,
  recordPublicationSuccess,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "../application_root.js";
import {
  durableStateIsNewer,
  evaluatePublicationGate,
} from "../publication/inspection.js";
import {
  acquirePublicationLock,
  PublicationStateError,
  readPublicationHistory,
  releasePublicationLock,
  writePublicationHistory,
  writePublicationState,
} from "../publication/state.js";
import type { PublishCommandOptions } from "./publish.js";
import { createPublishContext, createRun } from "./publish_context.js";
import {
  printJson,
  printPlan,
  printRunDetails,
  printValidation,
} from "./publish_print.js";

export async function runGate(
  project: RiebeckiteProject,
  options: PublishCommandOptions,
): Promise<boolean> {
  const context = await createPublishContext(project, options);
  const gate = evaluatePublicationGate(context);
  if (options.json) {
    console.log(
      JSON.stringify(
        {
          command: "gate",
          allowed: gate.allowed,
          reasons: gate.reasons,
          approvalRequired:
            project.config.publication?.requireApproval === true,
          plan: context.plan,
          artifactIssues: context.artifactIssues,
          durableState: context.durableState,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`Publication gate: ${gate.allowed ? "allowed" : "blocked"}.`);
    printPlan(context);
    for (const reason of gate.reasons) console.log(`  reason: ${reason}`);
  }
  return gate.allowed;
}

export async function runRecord(
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
  if (durableStateIsNewer(context)) {
    throw new PublicationStateError(
      `Publication state at ${context.stateFile} is newer than the build output. Check out the latest state or rebuild before recording.`,
    );
  }
  const run: PublicationRunRecord = {
    ...createRun(context.plan, options, "deployed", false),
    finishedAt: new Date().toISOString(),
    artifactFingerprint: context.artifact.artifactFingerprint,
    provider: context.provider,
    deploy: { status: "succeeded" },
  };
  const snapshot = createPublicationSnapshot(context.plan, {
    runId: run.id,
    artifactFingerprint: context.artifact.artifactFingerprint,
    provider: context.provider,
  });
  const lock = await acquirePublicationLock(
    project,
    context.plan.publicationFingerprint,
  );
  let history: PublicationHistory;
  try {
    await writePublicationState(project, snapshot, options.stateFile);
    history = recordPublicationSuccess(
      appendPublicationRun(await readPublicationHistory(project), run),
      snapshot,
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
