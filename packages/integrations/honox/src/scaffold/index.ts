import fs from "node:fs/promises";
import path from "node:path";
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
  readonly overwrite?: boolean;
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
  const files = siteTemplateFiles(templateVariables(options, targetDirectory));
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
