import fs from "node:fs/promises";
import path from "node:path";
import {
  assertGitHubRepository,
  deploymentTemplateFiles,
} from "./deployment.js";
import { composeScaffoldPreset } from "./features.js";
import {
  type ScaffoldContentSource,
  type ScaffoldDeployment,
  ScaffoldSiteError,
  type ScaffoldSiteOptions,
  type ScaffoldSiteResult,
} from "./options.js";
import { resolveScaffoldPreset } from "./presets.js";
import type { SiteTemplateFile } from "./template_types.js";
import { siteTemplateFiles } from "./templates.js";
import {
  workerNameFromDirectory,
  wranglerConfigForDirectory,
} from "./wrangler-defaults.js";

export {
  deploymentWorkflow,
  type ScaffoldPublicationSchedule,
  scaffoldDeploymentFromFlags,
} from "./deployment.js";
export {
  isScaffoldFeatureName,
  parseScaffoldFeatures,
  SCAFFOLD_FEATURE_NAMES,
  SCAFFOLD_FEATURE_PACKS,
  type ScaffoldFeatureName,
  type ScaffoldFeaturePack,
} from "./features.js";
export {
  formatScaffoldNextSteps,
  type ScaffoldNextStepsOptions,
} from "./next-steps.js";
export {
  type ScaffoldContentSource,
  type ScaffoldDeployment,
  type ScaffoldDeploymentFlags,
  ScaffoldSiteError,
  type ScaffoldSiteMetadata,
  type ScaffoldSiteOptions,
  type ScaffoldSiteResult,
} from "./options.js";
export {
  isScaffoldPresetName,
  SCAFFOLD_DEFAULT_PRESET,
  SCAFFOLD_PRESETS,
  type ScaffoldPresetName,
  type ScaffoldPresetSummary,
} from "./presets.js";
export {
  isScaffoldUtilityName,
  parseScaffoldUtilities,
  SCAFFOLD_DEFAULT_UTILITIES,
  SCAFFOLD_UTILITIES,
  SCAFFOLD_UTILITY_NAMES,
  type ScaffoldUtilityName,
  type ScaffoldUtilitySummary,
} from "./utilities.js";
export {
  GITHUB_ACTIONS_SECRETS,
  wranglerConfigForDirectory,
} from "./wrangler-defaults.js";

const NO_DEPLOYMENT: ScaffoldDeployment = { type: "none" };

export async function scaffoldRiebeckiteSite(
  options: ScaffoldSiteOptions,
): Promise<ScaffoldSiteResult> {
  const targetDirectory = path.resolve(options.targetDirectory);
  const preset = composeScaffoldPreset(
    resolveScaffoldPreset(options.preset),
    options.features ?? [],
  );
  const deployment = options.deployment ?? NO_DEPLOYMENT;
  const externalContent = externalContentSource(deployment);

  if (externalContent !== undefined) {
    assertGitHubRepository(
      externalContent.contentRepository,
      "contentRepository",
    );
    assertGitHubRepository(externalContent.siteRepository, "siteRepository");
  }

  const files = [
    ...siteTemplateFiles(preset, templateVariables(options, targetDirectory), {
      cloudflareWorkers: deployment.type === "cloudflare-workers",
      utilities: options.utilities,
      ...(options.contentDirectory === undefined
        ? {}
        : { contentDirectory: options.contentDirectory }),
    }),
    ...deploymentTemplateOrConfig(deployment, targetDirectory, options),
  ];
  await assertTargetWritable(
    targetDirectory,
    files,
    options.overwrite ?? false,
  );

  for (const file of files) {
    const filePath = path.join(targetDirectory, file.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, file.content);
  }
  await ensureContentDirectory(
    targetDirectory,
    files,
    options.contentDirectory,
  );

  return { targetDirectory, files: files.map((file) => file.path) };
}

async function ensureContentDirectory(
  targetDirectory: string,
  files: readonly SiteTemplateFile[],
  contentDirectory?: string,
): Promise<void> {
  if (
    files.some(
      (file) => file.path === "content" || file.path.startsWith("content/"),
    )
  ) {
    return;
  }
  const resolved = path.resolve(targetDirectory, contentDirectory ?? "content");
  const relative = path.relative(targetDirectory, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return;
  await fs.mkdir(resolved, { recursive: true });
}

function externalContentSource(
  deployment: ScaffoldDeployment,
): Extract<ScaffoldContentSource, { type: "external" }> | undefined {
  if (deployment.type !== "github-actions") return undefined;
  return deployment.content.type === "external"
    ? deployment.content
    : undefined;
}

function deploymentTemplateOrConfig(
  deployment: ScaffoldDeployment,
  targetDirectory: string,
  options: ScaffoldSiteOptions,
): readonly SiteTemplateFile[] {
  const workerName = workerNameFromDirectory(path.basename(targetDirectory));
  switch (deployment.type) {
    case "github-actions":
      return deploymentTemplateFiles(deployment.content, undefined, {
        workerName,
        ...(options.customDomain === undefined
          ? {}
          : { customDomain: options.customDomain }),
      });
    case "cloudflare-workers":
      return [
        {
          path: "wrangler.jsonc",
          content: wranglerConfigForDirectory(
            targetDirectory,
            options.customDomain,
          ),
        },
      ];
    default:
      return [];
  }
}

function templateVariables(
  options: ScaffoldSiteOptions,
  targetDirectory: string,
): {
  name: string;
  title: string;
  description: string;
  baseUrl: string;
  locale: string;
  externalContent: boolean;
} {
  const name = normalizePackageName(
    options.name ?? path.basename(targetDirectory),
  );
  const site = options.site ?? {};
  const deployment = options.deployment ?? NO_DEPLOYMENT;
  return {
    name,
    title: site.title ?? name,
    description: site.description ?? "",
    baseUrl: site.baseUrl ?? "",
    locale: site.locale ?? "en",
    externalContent:
      deployment.type === "github-actions" &&
      deployment.content.type === "external",
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
