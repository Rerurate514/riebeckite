import {
  appendPublicationRun,
  createPublicationSnapshot,
  NoopLogger,
  NoopTracer,
  type PublicationHistory,
  recordPublicationSuccess,
  validatePublicationArtifact,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "../application_root.js";
import { readPublicationArtifact } from "../publication/artifact.js";
import {
  executeHostingDeployment,
  planHostingDeployment,
} from "../publication/hosting.js";
import { durableStateIsNewer } from "../publication/inspection.js";
import {
  acquirePublicationLock,
  PublicationStateError,
  readPublicationHistory,
  releasePublicationLock,
  writePublicationHistory,
  writePublicationState,
} from "../publication/state.js";
import { runBuild } from "./build.js";
import type { PublishCommandOptions } from "./publish.js";
import {
  createRun,
  type PublishContext,
  replaceRun,
} from "./publish_context.js";
import {
  printJson,
  printRunPlan,
  printRunResult,
  printValidation,
} from "./publish_print.js";

export async function runPublication(
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
  if (durableStateIsNewer(context) && !(options.force && artifactCurrent)) {
    throw new PublicationStateError(
      `Publication state at ${context.stateFile} is newer than the build output. Check out the latest state or rebuild before publishing.`,
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
    await runBuild(project, {
      full: false,
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
    await executeHostingDeployment(
      project,
      context.provider,
      hostingPlan,
      artifact,
    );
    run = {
      ...run,
      status: "deployed",
      finishedAt: new Date().toISOString(),
      artifactFingerprint: artifact.artifactFingerprint,
      deploy: { status: "succeeded", durationMs: Date.now() - deployStartedAt },
    };
    history = replaceRun(history, run);
    const snapshot = createPublicationSnapshot(plan, {
      runId: run.id,
      artifactFingerprint: artifact.artifactFingerprint,
      provider: context.provider,
    });
    await writePublicationState(project, snapshot, options.stateFile);
    history = recordPublicationSuccess(history, snapshot);
    await writePublicationHistory(project, history);
    if (options.json) printJson({ ...context, run }, "run", project);
    else printRunResult(run, project);
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
