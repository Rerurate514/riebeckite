#!/usr/bin/env node
// Detects imports that rely on undeclared or hoisted dependencies, imports of
// unexported subpaths, workspace dependency cycles, and forbidden layer
// dependencies. Every workspace package is checked; pass explicit directories
// to limit a run.
import fs from "node:fs";
import { builtinModules } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), "..");

const builtins = new Set(
  builtinModules.flatMap((name) => [name, `node:${name}`]),
);

const ignoredDirectories = new Set([
  "node_modules",
  "dist",
  "build",
  ".riebeckite",
  ".wrangler",
  ".git",
  "coverage",
  "templates",
  "fixtures",
  "fixture",
  "__fixtures__",
  "__golden__",
  "golden",
  "snapshots",
  "vendor",
]);

const workspacePatterns = [
  "packages/*",
  "packages/integrations/*",
  "packages/plugins/*",
  "packages/themes/*",
  "apps/*",
];

const sourceExtensions = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

// Official Plugin packages may build on a small number of shared Plugin
// contracts. Every edge needs a reason; anything else would make Plugin
// release order and optional installation unpredictable.
const allowedPluginDependencies = new Map([
  [
    "@riebeckite/plugin-article-metadata",
    new Set(["@riebeckite/plugin-taxonomy"]),
  ],
  ["@riebeckite/plugin-docs", new Set(["@riebeckite/plugin-navigation"])],
]);

const packageKinds = new Map([
  ["@riebeckite/core", "core"],
  ["@riebeckite/cli", "cli"],
  ["@riebeckite/node", "library"],
  ["@riebeckite/ui", "library"],
  ["@riebeckite/diagnostics", "library"],
  ["@riebeckite/diagram", "library"],
  ["@riebeckite/graph", "library"],
  ["@riebeckite/git-history", "library"],
  ["@riebeckite/preview", "library"],
  ["@riebeckite/runtime", "library"],
  ["@riebeckite/spa", "library"],
  ["@riebeckite/test", "test"],
]);

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function walk(directory, files) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) continue;
      walk(full, files);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!sourceExtensions.has(path.extname(entry.name))) continue;
    files.push(full);
  }
  return files;
}

function scriptKind(file) {
  if (file.endsWith(".tsx") || file.endsWith(".jsx")) return ts.ScriptKind.TSX;
  if (file.endsWith(".js") || file.endsWith(".mjs") || file.endsWith(".cjs")) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function packageName(specifier) {
  const segments = specifier.split("/");
  return specifier.startsWith("@")
    ? `${segments[0]}/${segments[1] ?? ""}`
    : segments[0];
}

function subpathOf(specifier) {
  const name = packageName(specifier);
  return specifier.slice(name.length);
}

function typesPackageName(name) {
  return name.startsWith("@")
    ? `@types/${name.slice(1).replace("/", "__")}`
    : `@types/${name}`;
}

function declaredDependencies(manifest) {
  return new Set([
    manifest.name,
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
  ]);
}

function isTypeOnlyImport(node) {
  if (ts.isImportDeclaration(node)) {
    if (node.importClause?.isTypeOnly) return true;
    const bindings = node.importClause?.namedBindings;
    if (
      bindings &&
      ts.isNamedImports(bindings) &&
      bindings.elements.length > 0
    ) {
      return bindings.elements.every((element) => element.isTypeOnly);
    }
    return false;
  }
  if (ts.isExportDeclaration(node)) return node.isTypeOnly;
  return false;
}

function collectImports(file) {
  const text = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    toPosix(file),
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(file),
  );
  const imports = [];
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push({
        specifier: node.moduleSpecifier.text,
        typeOnly: isTypeOnlyImport(node),
        position: node.getStart(sourceFile),
      });
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression
    ) {
      imports.push({
        specifier: node.moduleReference.expression.text,
        typeOnly: node.isTypeOnly,
        position: node.getStart(sourceFile),
      });
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require")) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      imports.push({
        specifier: node.arguments[0].text,
        typeOnly: false,
        position: node.getStart(sourceFile),
      });
    }
    ts.forEachChild(node, visit);
  };
  sourceFile.forEachChild(visit);
  return imports;
}

function packageKind(pkg) {
  if (packageKinds.has(pkg.name)) return packageKinds.get(pkg.name);
  if (pkg.relative.startsWith("packages/plugins/")) return "plugin";
  if (pkg.relative.startsWith("packages/themes/")) return "theme";
  if (pkg.relative.startsWith("packages/integrations/")) return "integration";
  if (pkg.relative.startsWith("apps/")) return "app";
  return "library";
}

function isRiebeckitePackage(name) {
  return name.startsWith("@riebeckite/") || name === "create-riebeckite";
}

// Tooling dependencies that are consumed by generated projects, externalized
// bundles, or JSX runtime resolution rather than by an import statement in
// this package. Keep each entry tied to a reason.
const nonImportedDependencies = new Map([
  [
    "@riebeckite/cli",
    new Set([
      "@hono/vite-build", // generated vite.config for new sites
      "esbuild", // external at bundle time, used by build tooling
      "hono", // generated app routes and types
      "honox", // generated app routes and vite plugin
      "vite", // loaded from the user's site at dev/build time
    ]),
  ],
  ["@riebeckite/plugin-d2", new Set(["@d2lang/d2"])], // WASM engine loaded by module name
  ["@riebeckite/plugin-diff", new Set(["hono"])], // JSX runtime via jsxImportSource
  ["@riebeckite/plugin-excalidraw", new Set(["lz-string"])], // browser module loaded by name
  ["@riebeckite/plugin-icons", new Set(["lucide-static"])], // icon files read from the package
  [
    "@riebeckite/plugin-markmap",
    new Set(["markmap-lib", "markmap-view"]), // client renderer loaded by name
  ],
  ["@riebeckite/plugin-mermaid", new Set(["mermaid"])], // client renderer loaded by name
  ["@riebeckite/plugin-qr-code", new Set(["qrcode"])], // encoder loaded by name
  ["@riebeckite/plugin-search", new Set(["hono"])], // JSX runtime via jsxImportSource
]);

function isIntentionalNonImport(ownerName, dependencyName) {
  return nonImportedDependencies.get(ownerName)?.has(dependencyName) ?? false;
}

function isTestFile(relativeFile) {
  return (
    /(^|\/)(test|tests|__tests__|spec)(\/|$)/.test(relativeFile) ||
    /\.(test|spec)\.[^/]+$/.test(relativeFile)
  );
}

function forbiddenDependency(kind, dependencyName, ownerName) {
  if (!isRiebeckitePackage(dependencyName)) return undefined;
  if (kind === "core") {
    return "Core must not depend on another Riebeckite package";
  }
  if (kind === "theme") {
    return dependencyName === "@riebeckite/core"
      ? undefined
      : "Themes may only depend on @riebeckite/core";
  }
  if (kind === "plugin") {
    if (
      dependencyName === "@riebeckite/cli" ||
      dependencyName === "@riebeckite/honox" ||
      dependencyName.startsWith("@riebeckite/honox-") ||
      dependencyName === "@riebeckite/preview"
    ) {
      return "Plugins must not depend on CLI, HonoX, or Preview packages";
    }
    if (dependencyName.startsWith("@riebeckite/theme-")) {
      return "Plugins must not depend on Themes";
    }
    if (
      dependencyName.startsWith("@riebeckite/plugin-") &&
      !allowedPluginDependencies.get(ownerName)?.has(dependencyName)
    ) {
      return `Plugin-to-Plugin dependency requires an allowed edge (${dependencyName})`;
    }
  }
  if (kind === "integration") {
    if (
      dependencyName === "@riebeckite/cli" ||
      dependencyName.startsWith("apps/")
    ) {
      return "Integrations must not depend on the CLI or the application";
    }
    if (dependencyName.startsWith("@riebeckite/theme-")) {
      return "Integrations must not depend on Themes";
    }
  }
  return undefined;
}

function exportsAllows(manifest, rawSubpath) {
  const exportsField = manifest.exports;
  if (exportsField === undefined) return true;
  const subpath = rawSubpath === "" ? "." : `.${rawSubpath}`;
  if (typeof exportsField === "string") return subpath === ".";
  if (subpath === ".") return "." in exportsField;
  for (const key of Object.keys(exportsField)) {
    if (key === subpath) return true;
    if (key.includes("*")) {
      const [prefix, suffix] = key.split("*");
      if (subpath.startsWith(prefix) && subpath.endsWith(suffix ?? "")) {
        return true;
      }
    }
  }
  return false;
}

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

function createPackage(root, directory) {
  const manifest = readJson(path.join(directory, "package.json"));
  return {
    name: manifest.name,
    directory,
    relative: toPosix(path.relative(root, directory)),
    manifest,
  };
}

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

function findCycles(graph, start) {
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

function formatFinding(finding) {
  const location = finding.file ? `${finding.file}: ` : "";
  return `[${finding.severity}] ${finding.package}: ${location}${finding.message}`;
}

function main() {
  const targets = process.argv.slice(2);
  const allPackages = collectWorkspacePackages(repositoryRoot);
  const selected =
    targets.length > 0
      ? allPackages.filter((pkg) =>
          targets.some((target) => {
            const resolved = path.resolve(repositoryRoot, target);
            return (
              resolved === pkg.directory ||
              toPosix(path.relative(repositoryRoot, pkg.directory)) ===
                toPosix(target)
            );
          }),
        )
      : allPackages;
  if (targets.length > 0 && selected.length !== targets.length) {
    console.error("Some targets are not workspace packages.");
    process.exitCode = 1;
    return;
  }

  const { findings } = analyzeWorkspace({
    root: repositoryRoot,
    packages: allPackages,
  });
  const directorySet = new Set(selected.map((pkg) => pkg.name));
  const selectedFindings = findings.filter((finding) =>
    directorySet.has(finding.package),
  );

  for (const pkg of selected) {
    const packageFindings = selectedFindings.filter(
      (finding) => finding.package === pkg.name,
    );
    const errors = packageFindings.filter(
      (finding) => finding.severity === "error",
    );
    const warnings = packageFindings.filter(
      (finding) => finding.severity === "warning",
    );
    if (packageFindings.length === 0) {
      console.log(`${pkg.relative}: all imports are declared and exported.`);
      continue;
    }
    for (const finding of [...errors, ...warnings]) {
      console.log(formatFinding(finding));
    }
    if (errors.length > 0) process.exitCode = 1;
  }
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(scriptPath)) {
  main();
}
