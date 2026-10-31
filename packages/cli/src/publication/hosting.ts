import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  HostingProvider,
  PublicationArtifactState,
} from "@riebeckite/core";
import {
  detectHostingProvider,
  HOSTING_ADAPTERS,
  resolveHostingCapabilities,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "../application_root.js";
import { resolveWranglerEntry, runDeploy } from "../commands/deploy.js";
import { resolvePublicationOutputDirectory } from "./artifact.js";

const WRANGLER_CONFIG_FILES = [
  "wrangler.jsonc",
  "wrangler.json",
  "wrangler.toml",
] as const;

export async function detectProjectHostingProvider(
  project: RiebeckiteProject,
): Promise<HostingProvider | undefined> {
  const roots = [project.appRoot, project.projectRoot];
  return detectHostingProvider({
    wranglerConfig: await anyRootHas(roots, WRANGLER_CONFIG_FILES),
    githubPagesWorkflow: await hasGithubPagesWorkflow(project),
    vercelConfig: await anyRootHas(roots, ["vercel.json"]),
    netlifyConfig: await anyRootHas(roots, ["netlify.toml"]),
  });
}

export type HostingPlan =
  | {
      readonly kind: "command";
      readonly provider: HostingProvider;
      readonly executable: string;
      readonly args: readonly string[];
      readonly cwd: string;
    }
  | {
      readonly kind: "ci";
      readonly provider: HostingProvider;
      readonly description: string;
    }
  | {
      readonly kind: "unsupported";
      readonly provider: HostingProvider;
      readonly reason: string;
    };

export async function planHostingDeployment(
  project: RiebeckiteProject,
  provider: HostingProvider,
): Promise<HostingPlan> {
  const outputDirectory = resolvePublicationOutputDirectory(project);
  switch (provider) {
    case "cloudflare-workers":
      return {
        kind: "command",
        provider,
        executable: "wrangler",
        args: ["deploy"],
        cwd: project.appRoot,
      };
    case "cloudflare-pages": {
      const projectName = process.env.RIEBECKITE_CLOUDFLARE_PAGES_PROJECT;
      return {
        kind: "command",
        provider,
        executable: "wrangler",
        args: [
          "pages",
          "deploy",
          outputDirectory,
          ...(projectName ? ["--project-name", projectName] : []),
        ],
        cwd: project.appRoot,
      };
    }
    case "github-pages":
      return {
        kind: "ci",
        provider,
        description:
          "GitHub Pages deploys from the repository workflow; trigger it with `gh workflow run deploy.yml`.",
      };
    case "netlify":
      return {
        kind: "command",
        provider,
        executable: "netlify",
        args: ["deploy", "--prod", "--dir", outputDirectory],
        cwd: project.projectRoot,
      };
    case "vercel":
      return {
        kind: "command",
        provider,
        executable: "vercel",
        args: ["deploy", "--prod", "--yes", outputDirectory],
        cwd: project.projectRoot,
      };
    default: {
      const exhaustive: never = provider;
      return {
        kind: "unsupported",
        provider: exhaustive,
        reason: `Unsupported hosting provider: ${String(exhaustive)}`,
      };
    }
  }
}

export class HostingDeployError extends Error {
  readonly hint?: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "HostingDeployError";
    this.hint = hint;
  }
}

/**
 * Executes a deployment without recording any credential. Cloudflare Workers
 * reuses the existing deploy command so login, config creation, and build
 * output checks stay in one place.
 */
export async function executeHostingDeployment(
  project: RiebeckiteProject,
  provider: HostingProvider,
  plan: HostingPlan,
  artifact: PublicationArtifactState,
): Promise<{ readonly confirmed: boolean }> {
  if (!artifact.exists) {
    throw new HostingDeployError("The build output directory does not exist.");
  }
  if (provider === "cloudflare-workers") {
    await runDeploy(project, { dryRun: false, skipPublicationGate: true });
    return { confirmed: true };
  }
  if (plan.kind === "ci") {
    if (project.config.publication?.mode === "managed") {
      throw new HostingDeployError(
        "Managed mode does not dispatch GitHub Pages deployments because the target workflow cannot be verified.",
        "Add `riebeckite publish gate --provider github-pages` to the Pages workflow, deploy with actions/deploy-pages, then run `riebeckite publish record --provider github-pages`.",
      );
    }
    if (process.env.GITHUB_ACTIONS === "true") {
      throw new HostingDeployError(
        "GitHub Pages is deployed by the workflow, not by publish run.",
        "Deploy with actions/deploy-pages and then run `riebeckite publish record --provider github-pages` in the same job.",
      );
    }
    const workflow = process.env.RIEBECKITE_GITHUB_WORKFLOW ?? "deploy.yml";
    const branch =
      process.env.GITHUB_REF_NAME ??
      (await resolveCurrentBranch(project.projectRoot));
    if (!branch) {
      throw new HostingDeployError(
        "Could not determine the branch to trigger for GitHub Pages.",
        "Run from a git branch or set GITHUB_REF_NAME.",
      );
    }
    const exitCode = await runProcess(
      "gh",
      ["workflow", "run", workflow, "--ref", branch],
      project.projectRoot,
    );
    if (exitCode !== 0) {
      throw new HostingDeployError(
        `gh workflow run ${workflow} exited with code ${exitCode}.`,
        "Authenticate the GitHub CLI with `gh auth login`.",
      );
    }
    return { confirmed: false };
  }
  if (plan.kind !== "command") {
    throw new HostingDeployError(plan.reason);
  }

  if (provider === "cloudflare-pages") {
    const entry = await resolveWranglerEntry(project.appRoot);
    const exitCode = await runProcess(
      process.execPath,
      [entry, ...plan.args],
      plan.cwd,
    );
    if (exitCode !== 0) {
      throw new HostingDeployError(
        `wrangler pages deploy exited with code ${exitCode}.`,
      );
    }
    return { confirmed: true };
  }

  const exitCode = await runProcess(plan.executable, plan.args, plan.cwd);
  if (exitCode !== 0) {
    throw new HostingDeployError(
      `${plan.executable} exited with code ${exitCode}.`,
      missingExecutableHint(provider),
    );
  }
  return { confirmed: true };
}

export function hostingCapabilities(provider: HostingProvider | undefined) {
  return resolveHostingCapabilities(provider);
}

export function hostingEnvironment(
  provider: HostingProvider,
): readonly string[] {
  return HOSTING_ADAPTERS[provider].requiredEnvironment;
}

function missingExecutableHint(provider: HostingProvider): string | undefined {
  const executable = HOSTING_ADAPTERS[provider].executable;
  return executable ? `Install the "${executable}" CLI.` : undefined;
}

async function anyRootHas(
  roots: readonly string[],
  names: readonly string[],
): Promise<boolean> {
  for (const root of roots) {
    for (const name of names) {
      try {
        if ((await fs.stat(path.join(root, name))).isFile()) return true;
      } catch {}
    }
  }
  return false;
}

async function hasGithubPagesWorkflow(
  project: RiebeckiteProject,
): Promise<boolean> {
  for (const root of [project.projectRoot, project.appRoot]) {
    const directory = path.join(root, ".github", "workflows");
    let entries: string[];
    try {
      entries = await fs.readdir(directory);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith(".yml") && !entry.endsWith(".yaml")) continue;
      const content = await fs
        .readFile(path.join(directory, entry), "utf8")
        .catch(() => "");
      if (
        /actions\/deploy-pages|upload-pages-artifact|github-pages|pages\/deploy/i.test(
          content,
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

async function resolveCurrentBranch(cwd: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const child = spawn("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on("error", () => resolve(undefined));
    child.on("exit", (code) => {
      const branch = output.trim();
      resolve(code === 0 && branch && branch !== "HEAD" ? branch : undefined);
    });
  });
}

function runProcess(
  executable: string,
  args: readonly string[],
  cwd: string,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd, stdio: "inherit" });
    child.on("error", (error) => {
      reject(
        new HostingDeployError(
          `Could not run ${executable}: ${error.message}`,
          missingExecutableHintForExecutable(executable),
        ),
      );
    });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

function missingExecutableHintForExecutable(
  executable: string,
): string | undefined {
  if (executable === "gh")
    return "Install the GitHub CLI with `gh auth login`.";
  return `Install the "${executable}" CLI.`;
}
