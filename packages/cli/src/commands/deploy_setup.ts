import path from "node:path";
import { GITHUB_ACTIONS_SECRETS } from "create-riebeckite/scaffold";
import type { RiebeckiteProject } from "../application_root.js";
import { createProcessRunner } from "../process_runner.js";
import { createSetupPrompts } from "../prompts.js";
import { resolveWranglerEntry } from "../publication/wrangler.js";
import {
  resolveApiToken,
  selectCloudflareAccount,
} from "./deploy_setup_cloudflare.js";
import {
  CloudflareAccountError,
  CloudflareAuthenticationError,
  DeploySetupError,
  type DeploySetupOptions,
  GitHubAuthenticationError,
  GitHubCliNotFoundError,
  GitHubRepositoryAccessError,
  GitHubSecretError,
  GitRepositoryMissingError,
} from "./deploy_setup_errors.js";
import {
  detectActionsEnabled,
  detectGitHubRepository,
  ensureDeploymentWorkflow,
} from "./deploy_setup_github.js";
import { openInBrowser } from "./deploy_setup_io.js";
import {
  isWranglerLoggedOut,
  parseCloudflareAccounts,
  parseDefaultBranch,
  parseNameWithOwner,
  parseSecretNames,
} from "./deploy_setup_parse.js";
import { registerSecret, registerVariable } from "./deploy_setup_secrets.js";

export async function runDeploySetup(
  project: RiebeckiteProject,
  options: DeploySetupOptions = {},
): Promise<void> {
  const runner = options.runner ?? createProcessRunner();
  const prompts = options.prompts ?? createSetupPrompts();
  const env = options.env ?? process.env;
  const resolveWrangler = options.resolveWrangler ?? resolveWranglerEntry;
  const openBrowser = options.openBrowser ?? openInBrowser;
  const writeLine = options.writeLine ?? ((line: string) => console.log(line));

  const projectRoot = project.projectRoot;

  const gitResult = await runner.run("git", ["rev-parse", "--show-toplevel"], {
    cwd: projectRoot,
  });
  if (gitResult.code === 127) {
    throw new GitRepositoryMissingError(
      "Could not run git. Install Git, then run this command again.",
    );
  }
  if (gitResult.code !== 0) {
    throw new GitRepositoryMissingError(
      "This project is not inside a Git repository.",
    );
  }
  const repoRoot = gitResult.stdout.trim() || projectRoot;
  if (path.resolve(repoRoot) !== path.resolve(projectRoot)) {
    throw new DeploySetupError(
      "The Riebeckite project is not at the root of its Git repository.",
      "Run this command from the repository that contains riebeckite.config.ts at its root.",
    );
  }

  const repository = await detectGitHubRepository(runner, prompts, repoRoot);

  const authResult = await runner.run(
    "gh",
    ["auth", "status", "--hostname", "github.com"],
    { cwd: repoRoot },
  );
  if (authResult.code === 127) {
    throw new GitHubCliNotFoundError("Could not find the GitHub CLI (gh).");
  }
  if (authResult.code !== 0) {
    throw new GitHubAuthenticationError("The GitHub CLI is not authenticated.");
  }

  const viewResult = await runner.run(
    "gh",
    ["repo", "view", repository, "--json", "nameWithOwner,defaultBranchRef"],
    { cwd: repoRoot },
  );
  if (viewResult.code !== 0) {
    throw new GitHubRepositoryAccessError(
      `Could not access the GitHub repository ${repository}.`,
    );
  }
  const confirmedRepository =
    parseNameWithOwner(viewResult.stdout) ?? repository;
  const defaultBranch = parseDefaultBranch(viewResult.stdout);

  const secretListResult = await runner.run(
    "gh",
    ["secret", "list", "--repo", confirmedRepository, "--json", "name"],
    { cwd: repoRoot },
  );
  if (secretListResult.code !== 0) {
    throw new GitHubSecretError(
      `Could not read the GitHub Actions secrets for ${confirmedRepository}.`,
    );
  }
  const secretNames = parseSecretNames(secretListResult.stdout);
  const variableListResult = await runner.run(
    "gh",
    ["variable", "list", "--repo", confirmedRepository, "--json", "name"],
    { cwd: repoRoot },
  );
  const variableNames =
    variableListResult.code === 0
      ? parseSecretNames(variableListResult.stdout)
      : undefined;

  const actionsEnabled = await detectActionsEnabled(
    runner,
    repoRoot,
    confirmedRepository,
  );

  const workflowReady = await ensureDeploymentWorkflow(
    repoRoot,
    writeLine,
    project.config?.publication?.schedule,
  );
  if (!workflowReady) {
    return;
  }

  const wranglerEntry = await resolveWrangler(projectRoot);
  const whoamiResult = await runner.run(
    process.execPath,
    [wranglerEntry, "whoami", "--json"],
    { cwd: projectRoot },
  );
  if (whoamiResult.code !== 0) {
    throw new CloudflareAuthenticationError(
      "Wrangler is not authenticated with Cloudflare.",
    );
  }
  if (isWranglerLoggedOut(whoamiResult.stdout)) {
    throw new CloudflareAuthenticationError(
      "Wrangler is not signed in to Cloudflare.",
    );
  }
  const accounts = parseCloudflareAccounts(whoamiResult.stdout);
  if (accounts === undefined || accounts.length === 0) {
    throw new CloudflareAccountError(
      "Could not read any Cloudflare accounts from Wrangler.",
      "Check that the Wrangler account has access to a Cloudflare account.",
    );
  }
  const account = await selectCloudflareAccount(accounts, env, prompts);

  if (variableNames?.has(GITHUB_ACTIONS_SECRETS.CLOUDFLARE_ACCOUNT_ID)) {
    writeLine(
      `✓ ${GITHUB_ACTIONS_SECRETS.CLOUDFLARE_ACCOUNT_ID} already configured`,
    );
  } else if (variableNames === undefined) {
    writeLine(
      "GitHub CLI cannot manage Actions variables. Update gh, or register the account id as a secret.",
    );
    await registerSecret(
      runner,
      repoRoot,
      confirmedRepository,
      secretNames,
      GITHUB_ACTIONS_SECRETS.CLOUDFLARE_ACCOUNT_ID,
      account.id,
      writeLine,
    );
  } else {
    await registerVariable(
      runner,
      repoRoot,
      confirmedRepository,
      account.id,
      writeLine,
    );
  }

  if (secretNames.has(GITHUB_ACTIONS_SECRETS.CLOUDFLARE_API_TOKEN)) {
    writeLine(
      `✓ ${GITHUB_ACTIONS_SECRETS.CLOUDFLARE_API_TOKEN} already configured`,
    );
  } else {
    const apiToken = await resolveApiToken(
      env,
      prompts,
      writeLine,
      openBrowser,
    );
    await registerSecret(
      runner,
      repoRoot,
      confirmedRepository,
      secretNames,
      GITHUB_ACTIONS_SECRETS.CLOUDFLARE_API_TOKEN,
      apiToken,
      writeLine,
    );
  }

  writeLine("");
  if (actionsEnabled) {
    writeLine("Continuous deployment is ready.");
    writeLine("");
    if (defaultBranch !== undefined && defaultBranch !== "main") {
      writeLine("Note: the generated workflow deploys on pushes to main.");
      writeLine(`This repository's default branch is ${defaultBranch}.`);
      writeLine("");
    }
    writeLine("Push to main to deploy:");
    writeLine("  git push");
  } else {
    writeLine("Continuous deployment is almost ready.");
    writeLine("");
    writeLine("GitHub Actions is disabled for this repository.");
    writeLine("Enable it under Settings -> Actions, then push to deploy.");
  }
}

export {
  CloudflareAccountError,
  CloudflareAuthenticationError,
  CloudflareTokenError,
  DeploySetupError,
  GitHubAuthenticationError,
  GitHubCliNotFoundError,
  GitHubRemoteMissingError,
  GitHubRepositoryAccessError,
  GitHubSecretError,
  GitRepositoryMissingError,
} from "./deploy_setup_errors.js";
export {
  isWranglerLoggedOut,
  looksLikeRiebeckiteWorkflow,
  normalizeWorkflow,
  parseCloudflareAccounts,
  parseGitRemoteUrl,
  parseSecretNames,
} from "./deploy_setup_parse.js";
