import fs from "node:fs";
import path from "node:path";

export function collectWorkspacePackages(root = repositoryRoot) {
  const packages = [];
  const seen = new Set();
  for (const pattern of workspacePatterns) {
    const [base, child] = pattern.split("/");
    const directory = path.join(root, base);
    if (!fs.existsSync(directory)) continue;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (child === "*") {
        if (
          ["node_modules", "dist", "build"].includes(entry.name) ||
          entry.name.startsWith(".")
        )
          continue;
        const manifestPath = path.join(directory, entry.name, "package.json");
        if (!fs.existsSync(manifestPath)) continue;
        const directoryPath = path.join(directory, entry.name);
        if (seen.has(directoryPath)) continue;
        seen.add(directoryPath);
        packages.push(createPackage(root, directoryPath));
      } else if (entry.name === child) {
        for (const nested of fs.readdirSync(path.join(directory, child), {
          withFileTypes: true,
        })) {
          if (!nested.isDirectory()) continue;
          const manifestPath = path.join(
            directory,
            child,
            nested.name,
            "package.json",
          );
          if (!fs.existsSync(manifestPath)) continue;
          const directoryPath = path.join(directory, child, nested.name);
          if (seen.has(directoryPath)) continue;
          seen.add(directoryPath);
          packages.push(createPackage(root, directoryPath));
        }
      }
    }
  }
  return packages.sort((left, right) =>
    left.relative.localeCompare(right.relative),
  );
}

export function createPackage(root, directory) {
  const manifest = readJson(path.join(directory, "package.json"));
  return {
    name: manifest.name,
    directory,
    relative: toPosix(path.relative(root, directory)),
    manifest,
  };
}

export function collectTargetPackages(
  targets,
  packages,
  root = repositoryRoot,
) {
  const workspacePackages = new Map(
    packages.map((pkg) => [path.resolve(pkg.directory), pkg]),
  );
  return targets.map((target) => {
    const directory = path.resolve(root, target);
    const workspacePackage = workspacePackages.get(directory);
    if (workspacePackage) return workspacePackage;
    if (!fs.existsSync(path.join(directory, "package.json"))) return undefined;
    return createPackage(root, directory);
  });
}
