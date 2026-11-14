import fs from "node:fs/promises";
import path from "node:path";
import {
  deploymentWorkflow,
  type ScaffoldPublicationSchedule,
} from "create-riebeckite/scaffold";
import type { CommandRunner } from "../process_runner.js";
import type { SetupPrompts } from "../prompts.js";
import { WORKFLOW_RELATIVE_PATH } from "./deploy_setup_constants.js";
import {
  GitHubRemoteMissingError,
  GitRepositoryMissingError,
} from "./deploy_setup_errors.js";
import { readTextFile } from "./deploy_setup_io.js";
import {
  looksLikeRiebeckiteWorkflow,
  normalizeWorkflow,
  parseGitRemoteUrl,
  splitLines,
  tryParseJson,
} from "./deploy_setup_parse.js";

export async function detectGitHubRepository(
  runner: CommandRunner,
  prompts: SetupPrompts,
  repoRoot: string,
): Promise<string> {
  const remotesResult = await runner.run("git", ["remote"], { cwd: repoRoot });
  if (remotesResult.code !== 0) {
    throw new GitRepositoryMissingError(
      "Could not read the Git remotes for this repository.",
    );
  }
  const remoteNames = splitLines(remotesResult.stdout);

  const groups = new Map<string, string[]>();
  for (const name of remoteNames) {
    const urlResult = await runner.run("git", ["remote", "get-url", name], {
      cwd: repoRoot,
    });
    if (urlResult.code !== 0) continue;
    const slug = parseGitRemoteUrl(urlResult.stdout);
    if (slug === undefined) continue;
    const names = groups.get(slug) ?? [];
    names.push(name);
    groups.set(slug, names);
  }

  const slugs = [...groups.keys()];
  if (slugs.length === 0) {
    throw new GitHubRemoteMissingError(
      "Could not find a GitHub remote for this repository.",
    );
  }
  if (slugs.length === 1) {
    const only = slugs[0];
    if (only !== undefined) return only;
  }
  if (!prompts.interactive) {
    throw new GitHubRemoteMissingError(
      `This repository has multiple GitHub remotes: ${slugs.join(", ")}.`,
      "Remove the extra remotes, or run the command interactively to choose one.",
    );
  }

  return prompts.select(
    "Select the GitHub repository to deploy from",
    slugs.map((slug) => ({
      value: slug,
      label: `${slug} (${(groups.get(slug) ?? []).join(", ")})`,
    })),
  );
}

export async function detectActionsEnabled(
  runner: CommandRunner,
  cwd: string,
  repository: string,
): Promise<boolean> {
  const result = await runner.run(
    "gh",
    ["api", `repos/${repository}/actions/permissions`],
    { cwd },
  );
  if (result.code !== 0) return true;
  const parsed = tryParseJson(result.stdout);
  if (typeof parsed !== "object" || parsed === null) return true;
  return (parsed as Record<string, unknown>).enabled !== false;
}

export async function ensureDeploymentWorkflow(
  repoRoot: string,
  writeLine: (line: string) => void,
  schedule?: ScaffoldPublicationSchedule,
): Promise<boolean> {
  const workflowPath = path.join(
    repoRoot,
    ".github",
    "workflows",
    "publish.yml",
  );
  const expected = expectedWorkflow(schedule);
  const existing = await readTextFile(workflowPath);

  if (existing === undefined) {
    await fs.mkdir(path.dirname(workflowPath), { recursive: true });
    await fs.writeFile(workflowPath, expected, "utf8");
    writeLine(`✓ Created ${WORKFLOW_RELATIVE_PATH}`);
    return true;
  }
  if (normalizeWorkflow(existing) === normalizeWorkflow(expected)) {
    writeLine(`✓ ${WORKFLOW_RELATIVE_PATH} already configured`);
    return true;
  }
  if (looksLikeRiebeckiteWorkflow(existing)) {
    writeLine("Existing Riebeckite deployment workflow detected.");
  } else {
    writeLine("Existing deployment workflow detected.");
  }
  writeLine(`  ${WORKFLOW_RELATIVE_PATH} was left unchanged.`);
  writeLine("  No changes were made.");
  return false;
}

export function expectedWorkflow(
  schedule?: ScaffoldPublicationSchedule,
): string {
  return deploymentWorkflow(undefined, schedule);
}
