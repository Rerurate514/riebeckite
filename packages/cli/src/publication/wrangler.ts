import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { resolveBuildOutputDirectory } from "@riebeckite/core";
import { wranglerConfigForDirectory } from "create-riebeckite/scaffold";
import type { RiebeckiteProject } from "../application_root.js";
import { assertPublicationGate } from "./inspection.js";

const WRANGLER_CONFIG_FILES = [
  "wrangler.jsonc",
  "wrangler.json",
  "wrangler.toml",
] as const;

export class MissingBuildOutputError extends Error {
  readonly hint: string;

  constructor(message: string) {
    super(message);
    this.name = "MissingBuildOutputError";
    this.hint = "Run: npm exec riebeckite build";
  }
}

class WranglerNotFoundError extends Error {
  readonly hint: string;

  constructor(message: string) {
    super(message);
    this.name = "WranglerNotFoundError";
    this.hint = "Install it with: npm install -D wrangler";
  }
}

class DeployError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeployError";
  }
}

export type WranglerProvider = "cloudflare-workers" | "cloudflare-pages";

export function resolveDeployRoot(project: RiebeckiteProject): string {
  return project.appRoot;
}

export async function runWranglerDeployment(
  project: RiebeckiteProject,
  options: {
    readonly provider: WranglerProvider;
    readonly dryRun: boolean;
    readonly skipPublicationGate?: boolean;
  },
): Promise<void> {
  const root = resolveDeployRoot(project);
  const configPath = await ensureWranglerConfig(root);
  await assertBuildOutput(project, root);
  if (!options.skipPublicationGate) {
    await assertPublicationGate(project, options.provider);
  }
  const entry = await resolveWranglerEntry(root);
  if (!options.dryRun) {
    await ensureAuthenticated(entry, root);
  }

  const args =
    options.provider === "cloudflare-workers"
      ? ["deploy", "--config", configPath]
      : [
          "pages",
          "deploy",
          resolveBuildOutputDirectory(project.config) ??
            path.join(root, "dist"),
          ...(process.env.RIEBECKITE_CLOUDFLARE_PAGES_PROJECT
            ? [
                "--project-name",
                process.env.RIEBECKITE_CLOUDFLARE_PAGES_PROJECT,
              ]
            : []),
        ];
  if (options.dryRun && options.provider === "cloudflare-workers") {
    args.push("--dry-run");
  }
  const exitCode = await runNode(entry, args, {
    cwd: root,
    stdio: "inherit",
  });
  if (exitCode !== 0) {
    throw new DeployError(
      `${options.provider === "cloudflare-workers" ? "wrangler deploy" : "wrangler pages deploy"} exited with code ${exitCode}.`,
    );
  }
}

export async function findWranglerConfig(
  root: string,
): Promise<string | undefined> {
  for (const fileName of WRANGLER_CONFIG_FILES) {
    const filePath = path.join(root, fileName);
    if (await isFile(filePath)) return filePath;
  }
  return undefined;
}

async function ensureWranglerConfig(root: string): Promise<string> {
  const existing = await findWranglerConfig(root);
  if (existing !== undefined) return existing;

  const configPath = path.join(root, "wrangler.jsonc");
  const content = wranglerConfigForDirectory(root);
  await fs.writeFile(configPath, content, "utf8");
  console.log(`Created ${path.basename(configPath)}.`);
  return configPath;
}

async function assertBuildOutput(
  project: RiebeckiteProject,
  root: string,
): Promise<void> {
  const outputDirectory =
    resolveBuildOutputDirectory(project.config) ?? path.join(root, "dist");
  let isDirectory = false;
  try {
    isDirectory = (await fs.stat(outputDirectory)).isDirectory();
  } catch {
    isDirectory = false;
  }
  if (!isDirectory) {
    throw new MissingBuildOutputError(
      `Could not find the build output at ${outputDirectory}.`,
    );
  }
}

export async function resolveWranglerEntry(root: string): Promise<string> {
  for (const directory of parentDirectories(root)) {
    const entry = await readWranglerEntry(directory);
    if (entry) return entry;
  }
  throw new WranglerNotFoundError("Could not find the wrangler package.");
}

async function readWranglerEntry(
  directory: string,
): Promise<string | undefined> {
  const packageDirectory = path.join(directory, "node_modules", "wrangler");
  const manifestPath = path.join(packageDirectory, "package.json");
  let manifest: { bin?: unknown };
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as {
      bin?: unknown;
    };
  } catch {
    return undefined;
  }

  const bin = manifest.bin;
  const relative =
    typeof bin === "string"
      ? bin
      : typeof bin === "object" && bin !== null
        ? (bin as Record<string, unknown>).wrangler
        : undefined;
  if (typeof relative !== "string") return undefined;

  const entry = path.join(packageDirectory, relative);
  return (await isFile(entry)) ? entry : undefined;
}

async function ensureAuthenticated(entry: string, cwd: string): Promise<void> {
  const whoamiCode = await runNode(entry, ["whoami"], { cwd, stdio: "ignore" });
  if (whoamiCode === 0) return;

  console.log("Not signed in to Cloudflare. Opening Wrangler login...");
  const loginCode = await runNode(entry, ["login"], { cwd, stdio: "inherit" });
  if (loginCode !== 0) {
    throw new DeployError(`wrangler login exited with code ${loginCode}.`);
  }
}

function runNode(
  entry: string,
  arguments_: readonly string[],
  options: { cwd: string; stdio: "inherit" | "ignore" },
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entry, ...arguments_], {
      cwd: options.cwd,
      stdio: options.stdio,
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

function* parentDirectories(startDirectory: string): Generator<string> {
  let directory = startDirectory;
  while (true) {
    yield directory;
    const parent = path.dirname(directory);
    if (parent === directory) return;
    directory = parent;
  }
}

async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}
