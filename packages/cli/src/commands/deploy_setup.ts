import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import {
  deploymentWorkflow,
  GITHUB_ACTIONS_SECRETS,
} from "create-riebeckite/scaffold";
import type { RiebeckiteProject } from "../application_root.js";
import { type CommandRunner, createProcessRunner } from "../process_runner.js";
import { createSetupPrompts, type SetupPrompts } from "../prompts.js";
import { resolveWranglerEntry } from "./deploy.js";

const WORKFLOW_RELATIVE_PATH = ".github/workflows/deploy.yml";
const TOKEN_URL = "https://dash.cloudflare.com/profile/api-tokens";

export type CloudflareAccount = {
  readonly id: string;
  readonly name: string;
};

export type DeploySetupOptions = {
  readonly runner?: CommandRunner;
  readonly prompts?: SetupPrompts;
  readonly env?: NodeJS.ProcessEnv;
  readonly resolveWrangler?: (root: string) => Promise<string>;
  readonly openBrowser?: (url: string) => void | Promise<void>;
  readonly writeLine?: (line: string) => void;
};

export class GitRepositoryMissingError extends Error {
  readonly hint: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "GitRepositoryMissingError";
    this.hint =
      hint ??
      "Run this command inside a Git repository, or create one with: git init";
  }
}

export class GitHubRemoteMissingError extends Error {
  readonly hint: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "GitHubRemoteMissingError";
    this.hint =
      hint ??
      "Add a GitHub remote, for example: git remote add origin git@github.com:owner/repository.git";
  }
}

export class GitHubCliNotFoundError extends Error {
  readonly hint: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "GitHubCliNotFoundError";
    this.hint =
      hint ??
      "Install the GitHub CLI from https://cli.github.com/, then run: gh auth login";
  }
}

export class GitHubAuthenticationError extends Error {
  readonly hint: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "GitHubAuthenticationError";
    this.hint = hint ?? "Run: gh auth login";
  }
}

export class GitHubRepositoryAccessError extends Error {
  readonly hint: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "GitHubRepositoryAccessError";
    this.hint =
      hint ??
      "Check that the repository exists and that your GitHub account can access it.";
  }
}

export class GitHubSecretError extends Error {
  readonly hint: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "GitHubSecretError";
    this.hint =
      hint ??
      "Run the command again to retry. Secrets that are already configured are skipped.";
  }
}

export class CloudflareAuthenticationError extends Error {
  readonly hint: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "CloudflareAuthenticationError";
    this.hint = hint ?? "Run: npx wrangler login, then run this command again.";
  }
}

export class CloudflareAccountError extends Error {
  readonly hint: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "CloudflareAccountError";
    this.hint =
      hint ??
      "Set CLOUDFLARE_ACCOUNT_ID to the account id, or run interactively to choose an account.";
  }
}

export class CloudflareTokenError extends Error {
  readonly hint: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "CloudflareTokenError";
    this.hint =
      hint ??
      'Create a token with the "Workers Scripts: Edit" permission, then run the command again.';
  }
}

export class DeploySetupError extends Error {
  readonly hint: string | undefined;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "DeploySetupError";
    this.hint = hint;
  }
}

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

  const actionsEnabled = await detectActionsEnabled(
    runner,
    repoRoot,
    confirmedRepository,
  );

  const workflowReady = await ensureDeploymentWorkflow(repoRoot, writeLine);
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

  await registerSecret(
    runner,
    repoRoot,
    confirmedRepository,
    secretNames,
    GITHUB_ACTIONS_SECRETS.CLOUDFLARE_ACCOUNT_ID,
    account.id,
    writeLine,
  );

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

export function parseGitRemoteUrl(url: string): string | undefined {
  const trimmed = url.trim();
  const scheme = /^(?:https?|ssh|git):\/\//;
  if (scheme.test(trimmed)) {
    let value = trimmed.replace(scheme, "");
    const at = value.indexOf("@");
    if (at !== -1) value = value.slice(at + 1);
    const slash = value.indexOf("/");
    if (slash === -1) return undefined;
    const host = value.slice(0, slash).split(":")[0];
    if (host !== "github.com") return undefined;
    return normalizeSlug(value.slice(slash + 1));
  }

  const scp = /^[^@/]+@([^:/]+):(.+)$/.exec(trimmed);
  if (scp) {
    if (scp[1] !== "github.com") return undefined;
    return normalizeSlug(scp[2] ?? "");
  }

  return undefined;
}

export function parseCloudflareAccounts(
  stdout: string,
): readonly CloudflareAccount[] | undefined {
  const parsed = tryParseJson(stdout);
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const record = parsed as Record<string, unknown>;
  if (record.loggedIn !== true) return undefined;
  if (!Array.isArray(record.accounts)) return undefined;

  const accounts: CloudflareAccount[] = [];
  for (const entry of record.accounts) {
    if (typeof entry !== "object" || entry === null) continue;
    const id = (entry as Record<string, unknown>).id;
    const name = (entry as Record<string, unknown>).name;
    if (typeof id === "string" && id.length > 0) {
      accounts.push({
        id,
        name: typeof name === "string" ? name : "(unnamed account)",
      });
    }
  }
  return accounts;
}

export function isWranglerLoggedOut(stdout: string): boolean {
  const parsed = tryParseJson(stdout);
  if (typeof parsed !== "object" || parsed === null) return false;
  return (parsed as Record<string, unknown>).loggedIn === false;
}

export function parseSecretNames(stdout: string): Set<string> {
  const parsed = tryParseJson(stdout);
  const names = new Set<string>();
  if (!Array.isArray(parsed)) return names;
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) continue;
    const name = (entry as Record<string, unknown>).name;
    if (typeof name === "string" && name.length > 0) names.add(name);
  }
  return names;
}

export function looksLikeRiebeckiteWorkflow(content: string): boolean {
  return (
    content.includes("cloudflare/wrangler-action@") &&
    content.includes("riebeckite")
  );
}

export function normalizeWorkflow(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

async function detectGitHubRepository(
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

async function detectActionsEnabled(
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

async function ensureDeploymentWorkflow(
  repoRoot: string,
  writeLine: (line: string) => void,
): Promise<boolean> {
  const workflowPath = path.join(
    repoRoot,
    ".github",
    "workflows",
    "deploy.yml",
  );
  const expected = expectedWorkflow();
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

function expectedWorkflow(): string {
  return deploymentWorkflow();
}

async function selectCloudflareAccount(
  accounts: readonly CloudflareAccount[],
  env: NodeJS.ProcessEnv,
  prompts: SetupPrompts,
): Promise<CloudflareAccount> {
  const pinned = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  if (pinned !== undefined && pinned.length > 0) {
    const match = accounts.find((account) => account.id === pinned);
    if (match === undefined) {
      throw new CloudflareAccountError(
        `CLOUDFLARE_ACCOUNT_ID is set to ${pinned}, but Wrangler does not have access to that account.`,
      );
    }
    return match;
  }
  if (accounts.length === 1) {
    const only = accounts[0];
    if (only !== undefined) return only;
  }
  if (!prompts.interactive) {
    throw new CloudflareAccountError(
      "Multiple Cloudflare accounts are available. Set CLOUDFLARE_ACCOUNT_ID to choose one.",
      "Run again with CLOUDFLARE_ACCOUNT_ID set to the account id, or run interactively to choose.",
    );
  }
  return prompts.select(
    "Select the Cloudflare account to deploy to",
    accounts.map((account) => ({
      value: account,
      label: `${account.name} (${account.id})`,
    })),
  );
}

async function resolveApiToken(
  env: NodeJS.ProcessEnv,
  prompts: SetupPrompts,
  writeLine: (line: string) => void,
  openBrowser: (url: string) => void | Promise<void>,
): Promise<string> {
  const fromEnvironment = env.CLOUDFLARE_API_TOKEN?.trim();
  if (fromEnvironment !== undefined && fromEnvironment.length > 0) {
    writeLine("Using CLOUDFLARE_API_TOKEN from the environment.");
    return fromEnvironment;
  }
  if (!prompts.interactive) {
    throw new CloudflareTokenError(
      "A Cloudflare API token is required for GitHub Actions. Set CLOUDFLARE_API_TOKEN to provide it.",
      'Create a token with the "Workers Scripts: Edit" permission, then run again with CLOUDFLARE_API_TOKEN set.',
    );
  }

  writeLine("A Cloudflare API token is required for GitHub Actions.");
  writeLine('Create a token with the "Workers Scripts: Edit" permission:');
  writeLine(`  ${TOKEN_URL}`);
  const shouldOpen = await prompts.confirm(
    "Open the Cloudflare token page in your browser?",
    true,
  );
  if (shouldOpen) {
    await openBrowser(TOKEN_URL);
  }
  const token = (
    await prompts.password("Paste the Cloudflare API token: ")
  ).trim();
  if (token.length === 0) {
    throw new CloudflareTokenError("No Cloudflare API token was provided.");
  }
  return token;
}

async function registerSecret(
  runner: CommandRunner,
  cwd: string,
  repository: string,
  existing: ReadonlySet<string>,
  name: string,
  value: string,
  writeLine: (line: string) => void,
): Promise<void> {
  if (existing.has(name)) {
    writeLine(`✓ ${name} already configured`);
    return;
  }
  const result = await runner.run(
    "gh",
    ["secret", "set", name, "--repo", repository],
    { cwd, input: value },
  );
  if (result.code !== 0) {
    throw new GitHubSecretError(`Could not register the ${name} secret.`);
  }
  writeLine(`✓ ${name} configured`);
}

function normalizeSlug(pathPart: string): string | undefined {
  const cleaned = pathPart.replace(/\.git$/, "").replace(/\/$/, "");
  const segments = cleaned.split("/").filter((segment) => segment.length > 0);
  if (segments.length !== 2) return undefined;
  const [owner, repository] = segments;
  if (owner === undefined || repository === undefined) return undefined;
  return `${owner}/${repository}`;
}

function parseNameWithOwner(stdout: string): string | undefined {
  const parsed = tryParseJson(stdout);
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const owner = (parsed as Record<string, unknown>).nameWithOwner;
  return typeof owner === "string" && owner.length > 0 ? owner : undefined;
}

function parseDefaultBranch(stdout: string): string | undefined {
  const parsed = tryParseJson(stdout);
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const ref = (parsed as Record<string, unknown>).defaultBranchRef;
  if (typeof ref !== "object" || ref === null) return undefined;
  const name = (ref as Record<string, unknown>).name;
  return typeof name === "string" && name.length > 0 ? name : undefined;
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

async function readTextFile(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

async function openInBrowser(url: string): Promise<void> {
  const command =
    process.platform === "win32"
      ? "cmd"
      : process.platform === "darwin"
        ? "open"
        : "xdg-open";
  const arguments_ =
    process.platform === "win32" ? ["/c", "start", "", url] : [url];
  await new Promise<void>((resolve) => {
    const child = spawn(command, arguments_, {
      detached: true,
      stdio: "ignore",
    });
    child.on("error", () => resolve());
    child.on("spawn", () => resolve());
    child.unref();
  });
}
