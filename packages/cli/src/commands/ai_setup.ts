import fs from "node:fs/promises";
import path from "node:path";
import {
  type AiClient,
  type AiPackageManager,
  aiClientConfigPath,
  aiRuleFiles,
  mergeAiClientConfig,
} from "@riebeckite/ai";
import type { RiebeckiteProject } from "../application_root.js";
import { cliVersion } from "../version.js";
import { syncSkills } from "./skills.js";
import { detectPackageManager } from "./upgrade_install.js";

const MCP_PACKAGE = "@riebeckite/mcp";
const AI_PACKAGE = "@riebeckite/ai";
const versionPattern = /^riebeckiteVersion:\s*["']?([^"'\n]+)["']?/m;

export async function runAiSetup(
  project: RiebeckiteProject,
  confirm: (message: string, initial: boolean) => Promise<boolean>,
  options: { readonly clients?: readonly AiClient[] } = {},
): Promise<void> {
  const contentDirectory = project.config.content.directory;
  const packageManager: AiPackageManager =
    (await detectPackageManager(project.projectRoot)) ?? "npm";
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
      packageManager,
    },
    cliVersion,
  );
  for (const file of rules) {
    const target = path.join(project.projectRoot, file.path);
    const exists = await fs
      .access(target)
      .then(() => true)
      .catch(() => false);
    if (exists) {
      if (file.path === "RIEBECKITE_AI.md") {
        const currentVersion = versionPattern.exec(
          await fs.readFile(target, "utf8"),
        )?.[1];
        if (currentVersion !== cliVersion) {
          console.log(
            `  RIEBECKITE_AI.md was generated for ${currentVersion ?? "an unknown version"}; review it for ${cliVersion}.`,
          );
        }
      }
      console.log(`  ${file.path} already exists; not changed.`);
      continue;
    }
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, file.content, "utf8");
    console.log(`✓ Created ${file.path}`);
  }
  for (const client of options.clients ?? []) {
    const target = path.join(project.projectRoot, aiClientConfigPath(client));
    const existing = await fs.readFile(target, "utf8").catch(() => undefined);
    const result = mergeAiClientConfig(client, existing, packageManager);
    if (result.status === "invalid") {
      console.log(`  ${result.path} was not changed: ${result.message}`);
      continue;
    }
    if (result.status === "unchanged") {
      console.log(
        `  ${result.path} already has a riebeckite server; not changed.`,
      );
      continue;
    }
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, result.content, "utf8");
    console.log(
      `✓ ${existing === undefined ? "Created" : "Updated"} ${result.path}`,
    );
  }
  await updatePackageJson(project.projectRoot, packageManager);
  await syncSkills(project.projectRoot, confirm, "reset", {
    contentDirectory,
    title: project.config.site.title,
    locale: project.config.site.locale,
  });
  console.log("");
  console.log("Register this stdio command with your AI client:");
  console.log(
    `  ${packageManager === "pnpm" ? "pnpm exec" : "npm exec --"} riebeckite ai mcp`,
  );
}

async function updatePackageJson(
  projectRoot: string,
  packageManager: AiPackageManager,
): Promise<void> {
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
  for (const packageName of [AI_PACKAGE, MCP_PACKAGE]) {
    if (
      typeof dependencies[packageName] === "string" ||
      typeof devDependencies[packageName] === "string"
    )
      continue;
    devDependencies[packageName] = `^${cliVersion}`;
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
  console.log(`Run ${packageManager} install to install new dependencies.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
