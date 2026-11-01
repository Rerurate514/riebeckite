import fs from "node:fs/promises";
import path from "node:path";
import { deploymentWorkflow } from "create-riebeckite/scaffold";
import type { RiebeckiteProject } from "../application_root.js";
import {
  looksLikeRiebeckiteWorkflow,
  normalizeWorkflow,
} from "./deploy_setup.js";

const WORKFLOW_RELATIVE_PATH = ".github/workflows/publish.yml";

type DeployWorkflowSchedule = {
  readonly enabled: boolean;
  readonly intervalMinutes: number;
};

type DeployWorkflowOptions = {
  readonly check?: boolean;
  readonly writeLine?: (line: string) => void;
};

export class DeployWorkflowError extends Error {
  readonly hint: string | undefined;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "DeployWorkflowError";
    this.hint = hint;
  }
}

export async function runDeployWorkflow(
  project: RiebeckiteProject,
  options: DeployWorkflowOptions = {},
): Promise<void> {
  const writeLine = options.writeLine ?? ((line: string) => console.log(line));
  const workflowPath = path.join(project.projectRoot, WORKFLOW_RELATIVE_PATH);
  const schedule = project.config?.publication?.schedule;
  const existing = await readTextFile(workflowPath);

  if (existing === undefined) {
    if (options.check === true) {
      throw new DeployWorkflowError(
        `${WORKFLOW_RELATIVE_PATH} does not exist.`,
        "Run: riebeckite deploy workflow",
      );
    }
    await fs.mkdir(path.dirname(workflowPath), { recursive: true });
    await fs.writeFile(
      workflowPath,
      deploymentWorkflow(undefined, schedule),
      "utf8",
    );
    writeLine(`✓ Created ${WORKFLOW_RELATIVE_PATH}`);
    return;
  }

  if (!looksLikeRiebeckiteWorkflow(existing)) {
    throw new DeployWorkflowError(
      `${WORKFLOW_RELATIVE_PATH} does not look like a Riebeckite deployment workflow.`,
      "Review it manually, or remove it and run: riebeckite deploy workflow",
    );
  }

  const updated = withSchedule(existing, schedule);
  if (normalizeWorkflow(updated) === normalizeWorkflow(existing)) {
    writeLine(`✓ ${WORKFLOW_RELATIVE_PATH} is up to date`);
    return;
  }
  if (options.check === true) {
    throw new DeployWorkflowError(
      `${WORKFLOW_RELATIVE_PATH} does not match publication.schedule.`,
      "Run: riebeckite deploy workflow",
    );
  }
  await fs.writeFile(workflowPath, updated, "utf8");
  writeLine(`✓ Updated ${WORKFLOW_RELATIVE_PATH}`);
}

function withSchedule(
  workflow: string,
  schedule: DeployWorkflowSchedule | undefined,
): string {
  const newline = workflow.includes("\r\n") ? "\r\n" : "\n";
  const lines = workflow.replaceAll("\r\n", "\n").split("\n");
  const onIndex = lines.findIndex((line) => /^on:\s*$/.test(line));
  if (onIndex < 0) {
    throw new DeployWorkflowError(
      "Could not find the workflow's on: trigger.",
      "Add the schedule trigger manually, or remove the file and run: riebeckite deploy workflow",
    );
  }

  let end = onIndex + 1;
  while (end < lines.length && /^\s+/.test(lines[end] ?? "")) end += 1;
  const block = lines.slice(onIndex + 1, end);

  const scheduleIndex = block.findIndex((line) => /^\s+schedule:/.test(line));
  const enabled = schedule?.enabled === true;
  const trigger = enabled
    ? ["  schedule:", `    - cron: "*/${schedule.intervalMinutes} * * * *"`]
    : [];

  if (scheduleIndex >= 0) {
    const indent = indentOf(block[scheduleIndex] ?? "");
    let scheduleEnd = scheduleIndex + 1;
    while (scheduleEnd < block.length) {
      const line = block[scheduleEnd] ?? "";
      if (line.trim().length === 0) {
        scheduleEnd += 1;
        continue;
      }
      if (indentOf(line) <= indent) break;
      scheduleEnd += 1;
    }
    block.splice(scheduleIndex, scheduleEnd - scheduleIndex, ...trigger);
  } else if (enabled) {
    const dispatchIndex = block.findIndex((line) =>
      /^\s+workflow_dispatch:\s*$/.test(line),
    );
    if (dispatchIndex < 0) {
      block.push(...trigger);
    } else {
      block.splice(dispatchIndex, 0, ...trigger);
    }
  }

  lines.splice(onIndex + 1, end - onIndex - 1, ...block);
  return lines.join(newline);
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

async function readTextFile(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}
