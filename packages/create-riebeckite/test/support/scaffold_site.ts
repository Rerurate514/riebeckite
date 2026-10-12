import fs from "node:fs/promises";
import path from "node:path";
import { scaffoldRiebeckiteSite } from "../../src/scaffold/index.js";
import { SCAFFOLD_DEFAULT_PRESET } from "../../src/scaffold/presets.js";

export async function generateStarterSite(targetDirectory: string) {
  await scaffoldRiebeckiteSite({
    targetDirectory,
    preset: SCAFFOLD_DEFAULT_PRESET,
    site: { locale: "en" },
    deployment: { type: "github-actions", content: { type: "local" } },
  });
}

export async function readScaffoldFile(
  root: string,
  relativePath: string,
): Promise<string | null> {
  try {
    return await fs.readFile(path.join(root, relativePath), "utf8");
  } catch {
    return null;
  }
}
