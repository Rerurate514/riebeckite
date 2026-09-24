import fs from "node:fs";
import path from "node:path";

export function createWorkspacePackageAliases(workspaceRoot: string) {
  const packagesRoot = path.join(workspaceRoot, "packages");
  if (!fs.existsSync(packagesRoot)) return [];

  return findWorkspacePackageDirectories(packagesRoot).flatMap(
    (packageDirectory) => {
      const packageJsonPath = path.join(packageDirectory, "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      if (typeof packageJson.name !== "string") return [];

      return createPackageAliases(
        packageJson.name,
        packageDirectory,
        packageJson,
      );
    },
  );
}

export function workspacePackageResolver(workspaceRoot: string) {
  const aliases = createWorkspacePackageAliases(workspaceRoot);
  return {
    name: "workspace-package-resolver",
    setup(buildApi: {
      onResolve: (
        options: { filter: RegExp },
        callback: (args: { path: string }) => { path: string } | null,
      ) => void;
    }) {
      buildApi.onResolve({ filter: /.*/ }, (args) => {
        const alias = aliases.find((currentAlias) =>
          currentAlias.find.test(args.path),
        );
        return alias ? { path: alias.replacement } : null;
      });
    },
  };
}

function findWorkspacePackageDirectories(rootDirectory: string): string[] {
  const packageJsonPath = path.join(rootDirectory, "package.json");
  if (fs.existsSync(packageJsonPath)) return [rootDirectory];

  return fs
    .readdirSync(rootDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) =>
      findWorkspacePackageDirectories(path.join(rootDirectory, entry.name)),
    );
}

function createPackageAliases(
  packageName: string,
  packageDirectory: string,
  packageJson: { exports?: Record<string, string>; main?: string },
) {
  const aliases: { find: RegExp; replacement: string }[] = [];
  const mainEntry = packageJson.exports?.["."] ?? packageJson.main;
  if (mainEntry) {
    aliases.push({
      find: new RegExp(`^${escapeRegExp(packageName)}$`),
      replacement: path.join(packageDirectory, mainEntry),
    });
  }

  for (const [subpath, target] of Object.entries(packageJson.exports ?? {})) {
    if (subpath === ".") continue;
    aliases.push({
      find: new RegExp(`^${escapeRegExp(packageName + subpath.slice(1))}$`),
      replacement: path.join(packageDirectory, target),
    });
  }

  return aliases;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
