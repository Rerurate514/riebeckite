import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { aiRuleFiles } from "@riebeckite/ai";
import type { RiebeckiteProject } from "../application_root.js";
import { syncSkills } from "./skills.js";

const MCP_PACKAGE = "@riebeckite/mcp";
const AI_PACKAGE = "@riebeckite/ai";
const require = createRequire(import.meta.url);

export async function runAiSetup(
  project: RiebeckiteProject,
  confirm: (message: string, initial: boolean) => Promise<boolean>,
): Promise<void> {
  const contentDirectory = project.config.content.directory;
  const rules = aiRuleFiles(
    {
      name: path.basename(project.projectRoot),
      title: project.config.site.title,
      description: project.config.site.description,
      baseUrl: project.config.site.baseUrl,
      locale: project.config.site.locale,
    },
    {
      contentDirectory,
      lint: true,
    },
  );
  for (const file of rules) {
    if (file.content === undefined) continue;
    const target = path.join(project.projectRoot, file.path);
    const exists = await fs
      .access(target)
      .then(() => true)
      .catch(() => false);
    if (exists) {
      console.log(`  ${file.path} already exists; not changed.`);
      continue;
    }
    await fs.writeFile(target, file.content, "utf8");
    console.log(`✓ Created ${file.path}`);
  }
  await updatePackageJson(project.projectRoot);
  await syncSkills(project.projectRoot, confirm, "reset", {
    contentDirectory,
    title: project.config.site.title,
    locale: project.config.site.locale,
  });
  console.log("");
  console.log("Register this stdio command with your AI client:");
  console.log("  npm exec riebeckite ai mcp");
}

async function updatePackageJson(projectRoot: string): Promise<void> {
  const packagePath = path.join(projectRoot, "package.json");
  const raw = await fs.readFile(packagePath, "utf8").catch(() => undefined);
  if (raw === undefined) {
    console.log(
      `  Add ${AI_PACKAGE} and ${MCP_PACKAGE} to package.json devDependencies.`,
    );
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.log(
      `  Add ${AI_PACKAGE} and ${MCP_PACKAGE} to package.json devDependencies.`,
    );
    return;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return;
  }
  const manifest = parsed as Record<string, unknown>;
  let changed = false;
  const devDependencies = isRecord(manifest.devDependencies)
    ? manifest.devDependencies
    : {};
  const dependencies = isRecord(manifest.dependencies)
    ? manifest.dependencies
    : {};
  const version = require("@riebeckite/cli/package.json").version as string;
  for (const packageName of [AI_PACKAGE, MCP_PACKAGE]) {
    if (
      typeof dependencies[packageName] === "string" ||
      typeof devDependencies[packageName] === "string"
    )
      continue;
    devDependencies[packageName] = `^${version}`;
    manifest.devDependencies = devDependencies;
    changed = true;
    console.log(`✓ Added ${packageName} to devDependencies`);
  }
  const scripts = isRecord(manifest.scripts) ? manifest.scripts : {};
  if (typeof scripts["content:lint"] !== "string") {
    scripts["content:lint"] = "riebeckite check";
    manifest.scripts = scripts;
    changed = true;
    console.log("✓ Added content:lint script");
  }
  if (!changed) return;
  await fs.writeFile(
    packagePath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  console.log("Run npm install to install new dependencies.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
