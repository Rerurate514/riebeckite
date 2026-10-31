import {
  createPublicationPlan,
  type HostingProvider,
  type PublicationApprovals,
  type PublicationArtifactState,
  type PublicationHistory,
  type PublicationPlan,
  type PublicationState,
  type PublicationWorkflowMode,
  publicationEntriesFromManifest,
  publicationOutputsFromManifest,
  publicationRedirectsFromManifest,
  resolvePublishingBuildTime,
  validatePublicationArtifact,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "../application_root.js";
import { readPublicationArtifact } from "./artifact.js";
import { loadPublicationManifest } from "./manifest.js";
import {
  readPublicationApprovals,
  readPublicationHistory,
  readPublicationState,
} from "./state.js";

export type PublicationInspection = {
  readonly buildTime: Date;
  readonly plan: PublicationPlan;
  readonly provider?: HostingProvider;
  readonly artifact: PublicationArtifactState;
  readonly history: PublicationHistory;
  readonly durableState: PublicationState;
  readonly approvals: PublicationApprovals;
  readonly approvalFile: string;
  readonly artifactIssues: ReturnType<typeof validatePublicationArtifact>;
};

export type PublicationInspectionOptions = {
  readonly provider?: HostingProvider;
  readonly at?: string;
  readonly approvals?: string;
  readonly workflow: PublicationWorkflowMode;
  /** Use the build marker completion time instead of the current time. */
  readonly useBuildTime?: boolean;
  readonly dryRun?: boolean;
};

/**
 * Shared inspection used by every publication and deploy path. It reads the
 * already-resolved publishing state from the content manifest, so managed
 * approval and artifact freshness are checked the same way everywhere.
 */
export async function inspectPublication(
  project: RiebeckiteProject,
  options: PublicationInspectionOptions,
): Promise<PublicationInspection> {
  const artifact = await readPublicationArtifact(project);
  const artifactBuildTime =
    options.useBuildTime &&
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
  const history = await readPublicationHistory(project);
  const durableState = await readPublicationState(project);
  const { approvals, file } = await readPublicationApprovals(
    project,
    options.approvals,
  );
  const previous = durableState.lastSuccess ?? history.lastSuccess;
  if (
    durableState.lastSuccess === undefined &&
    history.lastSuccess !== undefined
  ) {
    console.warn(
      "Publication state is missing; using the local history snapshot. Commit publication/state.json for durable change detection.",
    );
  }
  const plan = createPublicationPlan({
    buildTime,
    entries: publicationEntriesFromManifest(manifest),
    redirects: publicationRedirectsFromManifest(manifest),
    outputs: publicationOutputsFromManifest(manifest),
    ...(previous === undefined ? {} : { previous }),
    approvals,
    workflow: options.workflow,
    ...(options.provider === undefined ? {} : { provider: options.provider }),
    dryRun: options.dryRun ?? true,
    generatedAt: new Date(),
  });
  return {
    buildTime,
    plan,
    ...(options.provider === undefined ? {} : { provider: options.provider }),
    artifact,
    history,
    durableState,
    approvals,
    approvalFile: file,
    artifactIssues: validatePublicationArtifact({
      plan,
      artifact,
      ...(options.provider === undefined ? {} : { provider: options.provider }),
    }),
  };
}

export type PublicationGateResult = {
  readonly allowed: boolean;
  readonly reasons: readonly string[];
  readonly stateIsNewer: boolean;
  readonly artifactErrors: number;
};

/**
 * Every deploy path uses this gate. Approval is an optional additional check;
 * planning, artifact freshness, and durable-state ordering always apply.
 */
export function evaluatePublicationGate(
  inspection: PublicationInspection,
): PublicationGateResult {
  const reasons: string[] = [];
  if (inspection.plan.action === "blocked") {
    reasons.push(...inspection.plan.reasons);
  }
  const artifactErrors = inspection.artifactIssues.filter(
    (issue) => issue.severity === "error",
  ).length;
  if (artifactErrors > 0) reasons.push("artifact-invalid");
  const stateIsNewer = durableStateIsNewer(inspection);
  if (stateIsNewer) reasons.push("state-newer-than-artifact");
  return {
    allowed: reasons.length === 0,
    reasons,
    stateIsNewer,
    artifactErrors,
  };
}

export function durableStateIsNewer(
  inspection: PublicationInspection,
): boolean {
  const published = inspection.durableState.lastSuccess?.publishedAt;
  const completed = inspection.artifact.markerCompletedAt;
  return (
    published !== undefined &&
    completed !== undefined &&
    Date.parse(published) > Date.parse(completed)
  );
}

export class PublicationGateError extends Error {
  readonly hint: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "PublicationGateError";
    this.hint =
      hint ??
      "Approve the current content with `riebeckite publish approve`, rebuild, and rerun the publication gate.";
  }
}

export async function assertPublicationGate(
  project: RiebeckiteProject,
  provider?: HostingProvider,
): Promise<void> {
  const inspection = await inspectPublication(project, {
    ...(provider === undefined ? {} : { provider }),
    workflow: project.config.publication?.requireApproval
      ? "approved"
      : "direct",
    useBuildTime: true,
  });
  const gate = evaluatePublicationGate(inspection);
  if (gate.allowed) return;
  const hint = gate.reasons.includes("artifact-invalid")
    ? "Rebuild the site so the output matches the current plan, then rerun the publication gate."
    : gate.reasons.includes("state-newer-than-artifact")
      ? "Check out the latest publication state or rebuild before deploying."
      : undefined;
  throw new PublicationGateError(
    `Publication gate blocked the deploy: ${gate.reasons.join(", ")}.`,
    hint,
  );
}
