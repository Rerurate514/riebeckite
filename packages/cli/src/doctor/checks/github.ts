import fs from "node:fs/promises";
import path from "node:path";
import { GITHUB_ACTIONS_SECRETS } from "create-riebeckite/scaffold";
import type { RiebeckiteProject } from "../../application_root.js";
import {
  looksLikeRiebeckiteWorkflow,
  parseSecretNames,
} from "../../commands/deploy_setup.js";
import { createProcessRunner } from "../../process_runner.js";
import type { DoctorCheckResult } from "../types.js";

const WORKFLOW_PATH = ".github/workflows/deploy.yml";

export async function checkGitHub(
  project: RiebeckiteProject,
): Promise<readonly DoctorCheckResult[]> {
  const workflow = await readFile(
    path.join(project.projectRoot, WORKFLOW_PATH),
  );
  if (workflow === undefined) {
    return [
      {
        id: "github-workflow",
        label: "GitHub Actions",
        status: "warning",
        message: "No deployment workflow was found.",
        details: ["Run: npm exec riebeckite deploy setup"],
      },
    ];
  }
  const workflowResult: DoctorCheckResult = looksLikeRiebeckiteWorkflow(
    workflow,
  )
    ? {
        id: "github-workflow",
        label: "GitHub Actions workflow",
        status: "ok",
        message: `${WORKFLOW_PATH} is configured.`,
      }
    : {
        id: "github-workflow",
        label: "GitHub Actions workflow",
        status: "warning",
        message: `${WORKFLOW_PATH} is not a Riebeckite deployment workflow.`,
      };
  const runner = createProcessRunner();
  const auth = await runner.run(
    "gh",
    ["auth", "status", "--hostname", "github.com"],
    { cwd: project.projectRoot },
  );
  if (auth.code === 127) {
    return [
      workflowResult,
      {
        id: "github-auth",
        label: "GitHub authentication",
        status: "warning",
        message: "GitHub CLI is not installed.",
        details: ["Install gh to validate repository access and secrets."],
      },
    ];
  }
  if (auth.code !== 0) {
    return [
      workflowResult,
      {
        id: "github-auth",
        label: "GitHub authentication",
        status: "warning",
        message: "GitHub CLI is not authenticated.",
        details: ["Run: gh auth login"],
      },
    ];
  }
  const remote = await runner.run(
    "git",
    ["config", "--get", "remote.origin.url"],
    { cwd: project.projectRoot },
  );
  const repository = repositoryFromRemote(remote.stdout);
  if (remote.code !== 0 || repository === undefined) {
    return [
      workflowResult,
      {
        id: "github-repository",
        label: "GitHub repository",
        status: "warning",
        message: "No GitHub origin remote was found.",
      },
    ];
  }
  const secrets = await runner.run(
    "gh",
    ["secret", "list", "--repo", repository, "--json", "name"],
    { cwd: project.projectRoot },
  );
  if (secrets.code !== 0) {
    return [
      workflowResult,
      {
        id: "github-repository",
        label: "GitHub repository",
        status: "warning",
        message: `Could not access ${repository}.`,
      },
    ];
  }
  const names = parseSecretNames(secrets.stdout);
  const missing = [
    GITHUB_ACTIONS_SECRETS.CLOUDFLARE_API_TOKEN,
    GITHUB_ACTIONS_SECRETS.CLOUDFLARE_ACCOUNT_ID,
  ].filter((name) => !names.has(name));
  return [
    workflowResult,
    {
      id: "github-repository",
      label: "GitHub repository",
      status: "ok",
      message: `${repository} is accessible.`,
    },
    missing.length === 0
      ? {
          id: "github-secrets",
          label: "GitHub Actions secrets",
          status: "ok",
          message: "Cloudflare deployment secrets are configured.",
        }
      : {
          id: "github-secrets",
          label: "GitHub Actions secrets",
          status: "warning",
          message: "Required Cloudflare deployment secrets are missing.",
          details: missing,
        },
  ];
}

function repositoryFromRemote(value: string): string | undefined {
  const match = /github\.com[/:]([^/\s]+\/[^/\s]+?)(?:\.git)?\s*$/.exec(
    value.trim(),
  );
  return match?.[1];
}

async function readFile(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}
