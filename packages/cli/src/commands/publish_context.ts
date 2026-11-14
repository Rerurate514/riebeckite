import crypto from "node:crypto";
import type {
  HostingProvider,
  PublicationHistory,
  PublicationPlan,
  PublicationRunRecord,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "../application_root.js";
import { detectProjectHostingProvider } from "../publication/hosting.js";
import {
  inspectPublication,
  type PublicationInspection,
} from "../publication/inspection.js";
import type { PublishCommandOptions } from "./publish.js";

export type PublishContext = PublicationInspection;

export async function createPublishContext(
  project: RiebeckiteProject,
  options: PublishCommandOptions,
): Promise<PublishContext> {
  const provider = await resolveProvider(project, options.provider);
  const workflow =
    project.config.publication?.requireApproval === true ||
    options.workflow === "approved"
      ? "approved"
      : "direct";
  return await inspectPublication(project, {
    ...(provider === undefined ? {} : { provider }),
    ...(options.at === undefined ? {} : { at: options.at }),
    ...(options.approvals === undefined
      ? {}
      : { approvals: options.approvals }),
    ...(options.stateFile === undefined
      ? {}
      : { stateFile: options.stateFile }),
    workflow,
    useBuildTime:
      options.action === "validate" ||
      options.action === "record" ||
      options.action === "gate",
    dryRun:
      options.action === "run" ? !options.execute : options.action !== "record",
  });
}

export async function resolveProvider(
  project: RiebeckiteProject,
  override: HostingProvider | undefined,
): Promise<HostingProvider | undefined> {
  return override ?? (await detectProjectHostingProvider(project));
}

export function createRun(
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

export function replaceRun(
  history: PublicationHistory,
  run: PublicationRunRecord,
): PublicationHistory {
  return {
    ...history,
    runs: history.runs.map((record) => (record.id === run.id ? run : record)),
  };
}
