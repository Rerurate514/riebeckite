import fs from "node:fs/promises";
import path from "node:path";
import {
  assertGitHubRepository,
  deploymentTemplateFiles,
  type ScaffoldDeploymentOptions,
} from "./deployment.js";
import {
  resolveScaffoldPreset,
  type ScaffoldPreset,
  type ScaffoldPresetName,
} from "./presets.js";
import {
  type SiteTemplateFile,
  type SiteTemplateVariables,
  siteTemplateFiles,
} from "./templates.js";

export type ScaffoldSiteOptions = {
  readonly targetDirectory: string;
  readonly name?: string;
  readonly siteTitle?: string;
  readonly description?: string;
  readonly baseUrl?: string;
  readonly locale?: string;
  readonly preset?: ScaffoldPresetName | ScaffoldPreset;
  readonly overwrite?: boolean;
  /** Generate the Cloudflare Workers GitHub Actions workflow. */
  readonly githubActions?: boolean;
  /** Read content from this separate GitHub repository during deployment. */
  readonly contentRepository?: string;
  /** Site repository to notify from the generated content workflow. */
  readonly siteRepository?: string;
};

export type ScaffoldSiteResult = {
  readonly targetDirectory: string;
  readonly files: readonly string[];
};

export class ScaffoldSiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScaffoldSiteError";
  }
}

export async function scaffoldRiebeckiteSite(
  options: ScaffoldSiteOptions,
): Promise<ScaffoldSiteResult> {
  const targetDirectory = path.resolve(options.targetDirectory);
  const preset = resolveScaffoldPreset(options.preset);
  validateDeploymentOptions(options);
  const files = [
    ...siteTemplateFiles(preset, templateVariables(options, targetDirectory)),
    ...(options.githubActions
      ? deploymentTemplateFiles(deploymentOptions(options))
      : []),
  ];
  await assertTargetWritable(
    targetDirectory,
    files,
    options.overwrite ?? false,
  );

  for (const file of files) {
    const filePath = path.join(targetDirectory, file.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, file.content, "utf8");
  }

  return { targetDirectory, files: files.map((file) => file.path) };
}

function deploymentOptions(
  options: ScaffoldSiteOptions,
): ScaffoldDeploymentOptions {
  return {
    contentRepository: options.contentRepository,
    siteRepository: options.siteRepository,
  };
}

function validateDeploymentOptions(options: ScaffoldSiteOptions): void {
  try {
    if (options.contentRepository !== undefined) {
      assertGitHubRepository(options.contentRepository, "contentRepository");
    }
    if (options.siteRepository !== undefined) {
      assertGitHubRepository(options.siteRepository, "siteRepository");
    }
  } catch (error) {
    throw new ScaffoldSiteError(
      error instanceof Error ? error.message : String(error),
    );
  }
  if (options.contentRepository !== undefined && !options.githubActions) {
    throw new ScaffoldSiteError(
      "--content-repository requires --github-actions.",
    );
  }
  if (
    options.contentRepository !== undefined &&
    options.siteRepository === undefined
  ) {
    throw new ScaffoldSiteError(
      "--site-repository is required when --content-repository is used with --github-actions.",
    );
  }
}

function templateVariables(
  options: ScaffoldSiteOptions,
  targetDirectory: string,
): SiteTemplateVariables {
  const name = normalizePackageName(
    options.name ?? path.basename(targetDirectory),
  );
  return {
    name,
    title: options.siteTitle ?? name,
    description: options.description ?? "",
    baseUrl: options.baseUrl ?? "",
    locale: options.locale ?? "en",
  };
}

async function assertTargetWritable(
  targetDirectory: string,
  files: readonly SiteTemplateFile[],
  overwrite: boolean,
): Promise<void> {
  let entries: string[];
  try {
    entries = await fs.readdir(targetDirectory);
  } catch (error) {
    if (isNotFoundError(error)) return;
    throw error;
  }

  const conflicts = entries.filter((entry) =>
    files.some((file) => file.path.split("/")[0] === entry),
  );
  if (conflicts.length === 0) return;
  if (overwrite) return;

  throw new ScaffoldSiteError(
    `The target directory is not empty: ${targetDirectory}\n` +
      `Existing entries: ${conflicts.slice(0, 5).join(", ")}\n` +
      "Pass --force to overwrite generated files.",
  );
}

function normalizePackageName(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-_.]+/, "")
    .replace(/[-_.]+$/, "");
  return normalized || "riebeckite-site";
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
