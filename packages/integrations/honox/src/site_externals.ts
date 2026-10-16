import fs from "node:fs";
import path from "node:path";

export function siteRiebeckiteExternals(siteRoot: string): string[] {
  const packageJsonPath = path.join(siteRoot, "package.json");
  let contents: string;
  try {
    contents = fs.readFileSync(packageJsonPath, "utf8");
  } catch {
    return [];
  }
  let packageJson: { dependencies?: Record<string, unknown> };
  try {
    packageJson = JSON.parse(contents) as {
      dependencies?: Record<string, unknown>;
    };
  } catch {
    return [];
  }
  const dependencies = packageJson.dependencies;
  if (!dependencies || typeof dependencies !== "object") return [];
  return Object.keys(dependencies).filter(
    (name) =>
      name === "@riebeckite/core" ||
      name.startsWith("@riebeckite/plugin-") ||
      name.startsWith("@riebeckite/theme-"),
  );
}
