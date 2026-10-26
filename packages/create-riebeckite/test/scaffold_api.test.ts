import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import * as scaffold from "../src/scaffold/index.js";

const PUBLIC_RUNTIME_EXPORTS = [
  "GITHUB_ACTIONS_SECRETS",
  "SCAFFOLD_DEFAULT_PRESET",
  "SCAFFOLD_DEFAULT_UTILITIES",
  "SCAFFOLD_FEATURE_NAMES",
  "SCAFFOLD_FEATURE_PACKS",
  "SCAFFOLD_PRESETS",
  "SCAFFOLD_UTILITIES",
  "SCAFFOLD_UTILITY_NAMES",
  "ScaffoldSiteError",
  "deploymentWorkflow",
  "formatScaffoldNextSteps",
  "isScaffoldFeatureName",
  "isScaffoldPresetName",
  "isScaffoldUtilityName",
  "parseScaffoldFeatures",
  "parseScaffoldUtilities",
  "scaffoldDeploymentFromFlags",
  "scaffoldRiebeckiteSite",
  "wranglerConfigForDirectory",
];

const ALLOWED_CLI_IMPORTS = new Set([
  "GITHUB_ACTIONS_SECRETS",
  "SCAFFOLD_DEFAULT_PRESET",
  "SCAFFOLD_DEFAULT_UTILITIES",
  "SCAFFOLD_PRESETS",
  "ScaffoldContentSource",
  "ScaffoldDeployment",
  "ScaffoldDeploymentFlags",
  "ScaffoldFeatureName",
  "ScaffoldFeaturePack",
  "ScaffoldNextStepsOptions",
  "ScaffoldPresetName",
  "ScaffoldPresetSummary",
  "ScaffoldSiteError",
  "ScaffoldSiteMetadata",
  "ScaffoldSiteOptions",
  "ScaffoldSiteResult",
  "ScaffoldUtilityName",
  "deploymentWorkflow",
  "formatScaffoldNextSteps",
  "isScaffoldPresetName",
  "parseScaffoldFeatures",
  "parseScaffoldUtilities",
  "scaffoldDeploymentFromFlags",
  "scaffoldRiebeckiteSite",
  "wranglerConfigForDirectory",
]);

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.dirname(testDirectory);

test("the scaffold entry exposes only the intended public runtime values", () => {
  assert.deepEqual(
    Object.keys(scaffold).sort(),
    [...PUBLIC_RUNTIME_EXPORTS].sort(),
  );
});

test("@riebeckite/cli imports only the public scaffold surface", async () => {
  const sourceRoot = path.resolve(packageRoot, "..", "cli", "src");
  const namedImports = new Set<string>();
  for (const file of await listTypeScriptFiles(sourceRoot)) {
    const source = await fs.readFile(file, "utf8");
    for (const match of source.matchAll(
      /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+"create-riebeckite\/scaffold"/g,
    )) {
      for (const entry of match[1].split(",")) {
        const name = entry.trim().replace(/^type\s+/, "");
        if (name.length > 0) namedImports.add(name);
      }
    }
  }

  assert.ok(namedImports.size > 0);
  for (const name of namedImports) {
    assert.ok(ALLOWED_CLI_IMPORTS.has(name), name);
  }
});

test("the scaffold engine does not depend on the interactive CLI", async () => {
  const scaffoldRoot = path.join(packageRoot, "src", "scaffold");
  for (const file of await listTypeScriptFiles(scaffoldRoot)) {
    const source = await fs.readFile(file, "utf8");
    assert.equal(source.includes("@clack/prompts"), false, file);
  }
});

async function listTypeScriptFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, {
    recursive: true,
    withFileTypes: true,
  });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => path.join(entry.parentPath, entry.name));
}
