import fs from "node:fs";
import path from "node:path";
import { builtins, repositoryRoot } from "./check_dependencies_config.mjs";
import { collectWorkspacePackages } from "./check_dependencies_packages.mjs";
import {
  collectImports,
  declaredDependencies,
  exportsAllows,
  forbiddenDependency,
  isIntentionalNonImport,
  isRiebeckitePackage,
  isTestFile,
  packageKind,
  packageName,
  readJson,
  subpathOf,
  toPosix,
  typesPackageName,
  walk,
} from "./check_dependencies_util.mjs";

export function analyzeWorkspace(options = {}) {
  const root = options.root ?? repositoryRoot;
  const rootManifestPath = path.join(root, "package.json");
  const rootTooling = new Set(
    fs.existsSync(rootManifestPath)
      ? [
          ...Object.keys(readJson(rootManifestPath).dependencies ?? {}),
          ...Object.keys(readJson(rootManifestPath).devDependencies ?? {}),
        ]
      : [],
  );
  const packages = options.packages ?? collectWorkspacePackages(root);
  const packageByName = new Map(packages.map((pkg) => [pkg.name, pkg]));
  const findings = [];
  const usage = new Map(packages.map((pkg) => [pkg.name, new Set()]));
  const runtimeEdges = new Map(packages.map((pkg) => [pkg.name, new Set()]));
  const filesByPackage = new Map();

  for (const pkg of packages) {
    const packageDeclared = declaredDependencies(pkg.manifest);
    const files = walk(pkg.directory, []);
    filesByPackage.set(pkg.name, files);
    for (const file of files) {
      const relativeFile = toPosix(path.relative(root, file));
      const declared = isTestFile(relativeFile)
        ? new Set([...packageDeclared, ...rootTooling])
        : packageDeclared;
      for (const entry of collectImports(file)) {
        const specifier = entry.specifier;
        if (specifier.startsWith(".") || specifier.startsWith("/")) continue;
        if (
          specifier.startsWith("node:") ||
          specifier.startsWith("virtual:") ||
          specifier.startsWith("data:")
        ) {
          continue;
        }
        if (builtins.has(specifier)) continue;
        const name = packageName(specifier);
        if (!declared.has(name) && !declared.has(typesPackageName(name))) {
          findings.push({
            severity: "error",
            kind: "undeclared-import",
            package: pkg.name,
            file: relativeFile,
            specifier,
            message: `imports "${specifier}" but does not declare "${name}"`,
          });
          continue;
        }
        const target = packageByName.get(name);
        if (
          target &&
          !exportsAllows(
            target.manifest,
            subpathOf(specifier).replace(/[?#].*$/, ""),
          )
        ) {
          findings.push({
            severity: "error",
            kind: "unexported-subpath",
            package: pkg.name,
            file: relativeFile,
            specifier,
            message: `imports "${specifier}" but "${name}" does not export that subpath`,
          });
        }
        usage.get(pkg.name)?.add(name);
        if (target && !entry.typeOnly && !isTestFile(relativeFile)) {
          runtimeEdges.get(pkg.name)?.add(name);
        }
      }
    }
  }

  for (const pkg of packages) {
    const kind = packageKind(pkg);
    for (const dependency of runtimeEdges.get(pkg.name) ?? []) {
      const reason = forbiddenDependency(kind, dependency, pkg.name);
      if (!reason) continue;
      findings.push({
        severity: "error",
        kind: "forbidden-dependency",
        package: pkg.name,
        specifier: dependency,
        message: reason,
      });
    }
    for (const dependency of findCycles(runtimeEdges, pkg.name)) {
      const key = [...new Set([pkg.name, ...dependency])].sort().join("|");
      if (findings.some((finding) => finding.cycleKey === key)) continue;
      findings.push({
        severity: "error",
        kind: "workspace-cycle",
        package: pkg.name,
        cycleKey: key,
        message: `runtime dependency cycle: ${dependency.join(" -> ")}`,
      });
    }
    for (const dependency of Object.keys(pkg.manifest.dependencies ?? {})) {
      if (!isRiebeckitePackage(dependency)) {
        const used = usage.get(pkg.name);
        if (used?.has(dependency)) continue;
        if (isIntentionalNonImport(pkg.name, dependency)) continue;
        if (dependency.startsWith("@types/")) {
          const base = dependency.slice("@types/".length).replace("__", "/");
          if (used?.has(base)) continue;
        }
        findings.push({
          severity: "warning",
          kind: "unused-dependency",
          package: pkg.name,
          specifier: dependency,
          message: `declares "${dependency}" but no source file imports it`,
        });
      }
    }
  }

  return { packages, findings, runtimeEdges, filesByPackage };
}

export function findCycles(graph, start) {
  const cycles = [];
  const visit = (node, trail, visiting) => {
    for (const next of graph.get(node) ?? []) {
      if (next === start) {
        cycles.push([...trail, next]);
        continue;
      }
      if (visiting.has(next) || trail.includes(next)) continue;
      visiting.add(next);
      visit(next, [...trail, next], visiting);
      visiting.delete(next);
    }
  };
  visit(start, [start], new Set([start]));
  return cycles;
}
