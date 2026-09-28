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

type PackageJsonExports = string | Record<string, unknown> | null | undefined;

function createPackageAliases(
  packageName: string,
  packageDirectory: string,
  packageJson: { exports?: PackageJsonExports; main?: string },
) {
  const aliases: { find: RegExp; replacement: string }[] = [];
  const mainEntry =
    resolveExportsEntry(packageJson.exports) ?? packageJson.main;
  if (mainEntry) {
    aliases.push({
      find: new RegExp(`^${escapeRegExp(packageName)}$`),
      replacement: path.join(packageDirectory, mainEntry),
    });
  }

  if (!packageJson.exports || typeof packageJson.exports !== "object") {
    return aliases;
  }

  for (const [subpath, target] of Object.entries(packageJson.exports)) {
    if (subpath === "." || !subpath.startsWith(".")) continue;
    const resolvedTarget = resolveExportTarget(target);
    if (!resolvedTarget) continue;
    aliases.push({
      find: new RegExp(`^${escapeRegExp(packageName + subpath.slice(1))}$`),
      replacement: path.join(packageDirectory, resolvedTarget),
    });
  }

  return aliases;
}

function resolveExportsEntry(
  exportsField: PackageJsonExports,
): string | undefined {
  if (typeof exportsField === "string") return exportsField;
  if (!exportsField || typeof exportsField !== "object") return undefined;

  const rootTarget = exportsField["."];
  if (rootTarget !== undefined) return resolveExportTarget(rootTarget);

  const hasSubpaths = Object.keys(exportsField).some((key) =>
    key.startsWith("."),
  );
  if (hasSubpaths) return undefined;

  return resolveExportTarget(exportsField);
}

const exportConditionOrder = [
  "source",
  "import",
  "module",
  "browser",
  "default",
  "node",
  "require",
  "types",
] as const;

function resolveExportTarget(target: unknown): string | undefined {
  if (typeof target === "string") return target;
  if (!target || typeof target !== "object") return undefined;

  const record = target as Record<string, unknown>;
  for (const condition of exportConditionOrder) {
    if (condition in record) {
      const resolved = resolveExportTarget(record[condition]);
      if (resolved) return resolved;
    }
  }

  for (const value of Object.values(record)) {
    const resolved = resolveExportTarget(value);
    if (resolved) return resolved;
  }

  return undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
