import fs from "node:fs";
import path from "node:path";
import type { PluginContractFixture } from "@riebeckite/test/plugin-contract";

export function repositoryPluginContractFixtures(
  cwd: string,
): readonly PluginContractFixture[] {
  const repoRoot = findRepositoryRoot(cwd);
  if (!repoRoot) return [];
  const runner = path.join(
    repoRoot,
    "tests",
    "plugin-contracts",
    "meta-bind",
    "run.ts",
  );
  const packageDirectory = path.join(
    repoRoot,
    "packages",
    "plugins",
    "meta-bind",
  );
  if (
    !fs.existsSync(runner) ||
    !fs.existsSync(path.join(packageDirectory, "package.json"))
  )
    return [];
  const args = ["--import", "tsx", runner];
  return [
    {
      packageName: "@riebeckite/plugin-meta-bind",
      packageDirectory,
      integration: {
        command: process.execPath,
        args: [...args, "--no-browser"],
        cwd: repoRoot,
        browser: false,
      },
      full: {
        command: process.execPath,
        args,
        cwd: repoRoot,
        browser: true,
      },
    },
  ];
}

function findRepositoryRoot(start: string): string | undefined {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml")))
      return current;
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}
