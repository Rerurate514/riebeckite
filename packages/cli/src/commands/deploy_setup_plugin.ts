import fs from "node:fs/promises";
import path from "node:path";
import { readTextFile } from "./deploy_setup_io.js";

const DEPLOY_PACKAGE = "@riebeckite/plugin-deploy";
const DEPLOY_IMPORT = `import { deploy } from "${DEPLOY_PACKAGE}";`;
const DEPLOY_ENTRY = 'deploy({ provider: "cloudflare-workers" })';

export async function ensureDeployPlugin(
  projectRoot: string,
  writeLine: (line: string) => void,
): Promise<void> {
  const configPath = path.join(projectRoot, "riebeckite.config.ts");
  const source = await readTextFile(configPath);
  if (source === undefined) return;
  if (source.includes(DEPLOY_PACKAGE) || /\bdeploy\(/.test(source)) return;

  const array = /plugins:\s*\[([\s\S]*?)\n(\s*)\]/.exec(source);
  if (array?.[2] === undefined) return;
  const insertion = `plugins: [${array[1]}\n${array[2]}  ${DEPLOY_ENTRY},\n${array[2]}]`;
  const updated = insertImport(source.replace(array[0], insertion));
  if (updated === source) return;
  await fs.writeFile(configPath, updated, "utf8");
  writeLine(`✓ Added ${DEPLOY_ENTRY} to riebeckite.config.ts`);
  await addPluginDependency(projectRoot, writeLine);
}

function insertImport(source: string): string {
  const lines = source.split("\n");
  let lastImport = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index]?.startsWith("import ")) lastImport = index;
  }
  lines.splice(lastImport + 1, 0, DEPLOY_IMPORT);
  return lines.join("\n");
}

async function addPluginDependency(
  projectRoot: string,
  writeLine: (line: string) => void,
): Promise<void> {
  const packagePath = path.join(projectRoot, "package.json");
  const raw = await readTextFile(packagePath);
  if (raw === undefined) {
    writeLine(`  Add ${DEPLOY_PACKAGE} to package.json dependencies.`);
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    writeLine(`  Add ${DEPLOY_PACKAGE} to package.json dependencies.`);
    return;
  }
  if (typeof parsed !== "object" || parsed === null) return;
  const manifest = parsed as Record<string, unknown>;
  if (
    typeof manifest.dependencies !== "object" ||
    manifest.dependencies === null
  ) {
    manifest.dependencies = {};
  }
  const dependencies = manifest.dependencies as Record<string, unknown>;
  if (typeof dependencies[DEPLOY_PACKAGE] === "string") return;
  const version =
    typeof dependencies["@riebeckite/core"] === "string"
      ? dependencies["@riebeckite/core"]
      : riebeckiteVersion(dependencies);
  if (version === undefined) {
    writeLine(`  Add ${DEPLOY_PACKAGE} to package.json dependencies.`);
    return;
  }
  dependencies[DEPLOY_PACKAGE] = version;
  await fs.writeFile(
    packagePath,
    `${JSON.stringify(parsed, null, 2)}\n`,
    "utf8",
  );
  writeLine(`✓ Added ${DEPLOY_PACKAGE} to package.json dependencies`);
  writeLine("Run npm install to install it.");
}

function riebeckiteVersion(
  dependencies: Record<string, unknown>,
): string | undefined {
  for (const [name, version] of Object.entries(dependencies)) {
    if (name.startsWith("@riebeckite/") && typeof version === "string") {
      return version;
    }
  }
  return undefined;
}
