#!/usr/bin/env node
// Source health checks for responsibility boundaries and gradual file growth.
// Size findings are advisory; only mechanically verifiable architecture
// violations fail the check.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const baselinePath = path.join(
  repositoryRoot,
  "scripts",
  "source_health_baseline.json",
);
const baselineVersion = 1;

const sourceRoots = ["packages", "apps", "scripts"];
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
const ignoredDirectories = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  "templates",
  "fixtures",
  "fixture",
  "__fixtures__",
  "__snapshots__",
  "snapshots",
  "migrations",
  "generated",
  "vendor",
  "test",
  "tests",
  "__tests__",
  "spec",
]);
const ignoredFilePattern = /(^|[./_-])(test|spec)([./_-]|$)/i;

const fileWarningLines = 400;
const fileStrongWarningLines = 800;
const functionWarningLines = 80;
const growthFloorLines = 50;
const growthRatio = 0.1;

function toPosix(value) {
  return value.split(path.sep).join("/");
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
    if (ignoredFilePattern.test(entry.name)) continue;
    files.push(full);
  }
}

function collectSourceFiles() {
  const files = [];
  for (const root of sourceRoots) {
    const directory = path.join(repositoryRoot, root);
    if (fs.existsSync(directory)) walk(directory, files);
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

function lineCount(text) {
  const lines = text.split(/\r?\n/).length;
  return text.endsWith("\n") || text.endsWith("\r\n") ? lines - 1 : lines;
}

function lineOf(sourceFile, position) {
  return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
}

function isFunctionLike(node) {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node)
  );
}

function functionName(node) {
  if (node.name && ts.isIdentifier(node.name)) return node.name.text;
  if (node.name && ts.isStringLiteral(node.name)) return node.name.text;
  if (ts.isConstructorDeclaration(node)) return "constructor";
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    const parent = node.parent;
    if (parent && ts.isVariableDeclaration(parent)) {
      return parent.name.getText(node.getSourceFile());
    }
    if (parent && ts.isPropertyAssignment(parent)) {
      return parent.name.getText(node.getSourceFile());
    }
  }
  return "<anonymous>";
}

function moduleSpecifier(statement) {
  if (
    (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
    statement.moduleSpecifier &&
    ts.isStringLiteral(statement.moduleSpecifier)
  ) {
    return statement.moduleSpecifier.text;
  }
  return undefined;
}

function isTypeOnly(statement) {
  if (ts.isImportDeclaration(statement)) {
    return statement.importClause?.isTypeOnly === true;
  }
  if (ts.isExportDeclaration(statement)) return statement.isTypeOnly;
  return false;
}

function collectDynamicSpecifiers(sourceFile) {
  const specifiers = [];
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      (node.expression.text === "require" || node.expression.text === "import")
    ) {
      const first = node.arguments[0];
      if (first && ts.isStringLiteral(first)) specifiers.push(first.text);
    }
    ts.forEachChild(node, visit);
  };
  sourceFile.forEachChild(visit);
  return specifiers;
}

function resolveLocalImport(file, specifier, fileSet) {
  if (!specifier.startsWith(".")) return undefined;
  const base = path.resolve(path.dirname(file), specifier);
  const extensionless = base.replace(/\.(mjs|cjs|js|jsx)$/, "");
  const candidates = [
    base,
    `${extensionless}.ts`,
    `${extensionless}.tsx`,
    `${extensionless}.mts`,
    `${extensionless}.cts`,
    `${extensionless}.js`,
    `${extensionless}.jsx`,
    `${extensionless}.mjs`,
    `${extensionless}.cjs`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    path.join(base, "index.js"),
    path.join(base, "index.mjs"),
  ];
  return candidates.find((candidate) => fileSet.has(candidate));
}

function packageRootFor(file) {
  const relative = toPosix(path.relative(repositoryRoot, file));
  const parts = relative.split("/");
  if (parts[0] === "packages") {
    if (parts[1] === "plugins" || parts[1] === "integrations") {
      return parts.length >= 3
        ? `${parts[0]}/${parts[1]}/${parts[2]}`
        : undefined;
    }
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : undefined;
  }
  if (parts[0] === "apps") {
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : undefined;
  }
  return undefined;
}

function isPackageSpecifier(specifier) {
  return !specifier.startsWith(".") && !specifier.startsWith("/");
}

function forbiddenCoreImport(specifier) {
  if (specifier === "hono" || specifier.startsWith("hono/")) return true;
  if (specifier === "honox" || specifier.startsWith("honox/")) return true;
  if (specifier === "vite" || specifier.startsWith("vite/")) return true;
  return (
    specifier === "@riebeckite/honox" ||
    specifier.startsWith("@riebeckite/honox/") ||
    specifier.startsWith("@riebeckite/plugin-") ||
    specifier.startsWith("@riebeckite/theme-") ||
    specifier === "@riebeckite/cli" ||
    specifier.startsWith("@riebeckite/cli/") ||
    specifier === "@riebeckite/ui" ||
    specifier.startsWith("@riebeckite/ui/")
  );
}

function forbiddenPluginImport(specifier) {
  return (
    specifier === "@riebeckite/honox" ||
    specifier.startsWith("@riebeckite/honox/") ||
    specifier === "@riebeckite/cli" ||
    specifier.startsWith("@riebeckite/cli/")
  );
}

function forbiddenIntegrationImport(specifier) {
  return (
    specifier === "@riebeckite/cli" ||
    specifier.startsWith("@riebeckite/cli/") ||
    specifier.startsWith("apps/")
  );
}

function findCycles(graph) {
  const indexByNode = new Map();
  const lowLink = new Map();
  const onStack = new Set();
  const stack = [];
  const cycles = [];
  let index = 0;

  function strongConnect(node) {
    indexByNode.set(node, index);
    lowLink.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);

    for (const next of graph.get(node) ?? []) {
      if (!indexByNode.has(next)) {
        strongConnect(next);
        lowLink.set(node, Math.min(lowLink.get(node), lowLink.get(next)));
      } else if (onStack.has(next)) {
        lowLink.set(node, Math.min(lowLink.get(node), indexByNode.get(next)));
      }
    }

    if (lowLink.get(node) !== indexByNode.get(node)) return;
    const component = [];
    let current;
    do {
      current = stack.pop();
      onStack.delete(current);
      component.push(current);
    } while (current !== node);

    const selfCycle =
      component.length === 1 && (graph.get(node) ?? []).includes(node);
    if (component.length > 1 || selfCycle) {
      component.sort();
      cycles.push(
        component.map((file) => toPosix(path.relative(repositoryRoot, file))),
      );
    }
  }

  for (const node of graph.keys()) {
    if (!indexByNode.has(node)) strongConnect(node);
  }
  return cycles;
}

function loadBaseline() {
  if (!fs.existsSync(baselinePath)) return undefined;
  try {
    const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    if (
      baseline.version !== baselineVersion ||
      typeof baseline.files !== "object"
    ) {
      return undefined;
    }
    return baseline;
  } catch {
    return undefined;
  }
}

function writeBaseline(files) {
  const entries = [...files]
    .filter((file) => file.lines >= fileWarningLines)
    .sort((left, right) => left.path.localeCompare(right.path))
    .map((file) => [file.path, file.lines]);
  const baseline = {
    version: baselineVersion,
    description:
      "Advisory file-size baseline. Update intentionally with --write-baseline.",
    files: Object.fromEntries(entries),
  };
  fs.writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`Updated source health baseline with ${entries.length} file(s).`);
}

function formatFinding(kind, message) {
  return `[${kind}] ${message}`;
}

function analyze(files) {
  const fileSet = new Set(files);
  const records = [];
  const functions = [];
  const graph = new Map();
  const errors = [];
  const warnings = [];

  for (const file of files) {
    const relative = toPosix(path.relative(repositoryRoot, file));
    const text = fs.readFileSync(file, "utf8");
    const sourceFile = ts.createSourceFile(
      relative,
      text,
      ts.ScriptTarget.Latest,
      true,
      scriptKind(file),
    );
    const localImports = [];

    for (const statement of sourceFile.statements) {
      if (
        ts.isExportDeclaration(statement) &&
        statement.exportClause === undefined
      ) {
        warnings.push(
          formatFinding(
            "warning",
            `${relative}: wildcard export exposes an unbounded module surface`,
          ),
        );
      }
      const specifier = moduleSpecifier(statement);
      if (!specifier) continue;
      if (!isTypeOnly(statement)) {
        const target = resolveLocalImport(file, specifier, fileSet);
        if (target) localImports.push(target);
      }
      if (isPackageSpecifier(specifier)) {
        const packageRoot = packageRootFor(file);
        if (packageRoot === "packages/core" && forbiddenCoreImport(specifier)) {
          errors.push(
            formatFinding(
              "error",
              `${relative}: Core must not depend on "${specifier}"`,
            ),
          );
        }
        if (
          packageRoot?.startsWith("packages/plugins/") &&
          forbiddenPluginImport(specifier)
        ) {
          errors.push(
            formatFinding(
              "error",
              `${relative}: Plugin must not depend on "${specifier}"`,
            ),
          );
        }
        if (
          packageRoot?.startsWith("packages/integrations/") &&
          forbiddenIntegrationImport(specifier)
        ) {
          errors.push(
            formatFinding(
              "error",
              `${relative}: Integration must not depend on "${specifier}"`,
            ),
          );
        }
      }
    }

    for (const specifier of collectDynamicSpecifiers(sourceFile)) {
      const target = resolveLocalImport(file, specifier, fileSet);
      if (target) localImports.push(target);
    }

    const functionNames = new Map();
    const visit = (node) => {
      if (isFunctionLike(node) && node.body) {
        const start = lineOf(sourceFile, node.getStart(sourceFile));
        const end = lineOf(sourceFile, node.end);
        const name = functionName(node);
        const key = `${relative}:${start}:${name}`;
        functionNames.set(key, (functionNames.get(key) ?? 0) + 1);
        functions.push({
          path: relative,
          name,
          lines: end - start + 1,
          start,
        });
      }
      ts.forEachChild(node, visit);
    };
    sourceFile.forEachChild(visit);

    graph.set(file, [...new Set(localImports)]);
    records.push({
      path: relative,
      lines: lineCount(text),
      functionCount: functionNames.size,
    });
  }

  for (const cycle of findCycles(graph)) {
    errors.push(
      formatFinding(
        "error",
        `runtime circular import: ${cycle.join(" -> ")} -> ${cycle[0]}`,
      ),
    );
  }

  return { records, functions, errors, warnings };
}

function reportSizes(records, functions, errors, warnings) {
  const largeFiles = records
    .filter((record) => record.lines >= fileWarningLines)
    .sort((left, right) => right.lines - left.lines);
  const longFunctions = functions
    .filter((fn) => fn.lines >= functionWarningLines)
    .sort((left, right) => right.lines - left.lines);

  for (const record of largeFiles) {
    const strong = record.lines >= fileStrongWarningLines;
    warnings.push(
      formatFinding(
        strong ? "strong-warning" : "warning",
        `${record.path}: ${record.lines} lines${strong ? " (split review required)" : ""}`,
      ),
    );
  }
  for (const fn of longFunctions.slice(0, 30)) {
    warnings.push(
      formatFinding(
        "warning",
        `${fn.path}:${fn.start} ${fn.name}: ${fn.lines} lines`,
      ),
    );
  }

  console.log(
    `Source health: ${records.length} files, ${records.reduce((sum, record) => sum + record.lines, 0)} lines, ${functions.length} functions.`,
  );
  console.log(
    `Size signals: ${largeFiles.length} file(s) >= ${fileWarningLines} lines, ${largeFiles.filter((record) => record.lines >= fileStrongWarningLines).length} >= ${fileStrongWarningLines}, ${longFunctions.length} function(s) >= ${functionWarningLines} lines.`,
  );
  if (warnings.length > 0) {
    console.log(`\nAdvisory findings (${warnings.length}):`);
    for (const warning of warnings) console.log(warning);
  }
  if (errors.length > 0) {
    console.error(`\nArchitecture errors (${errors.length}):`);
    for (const error of errors) console.error(error);
  }
}

const args = new Set(process.argv.slice(2));
const files = collectSourceFiles();
const { records, functions, errors, warnings } = analyze(files);

if (args.has("--write-baseline")) {
  writeBaseline(records);
  process.exit(0);
}

reportSizes(records, functions, errors, warnings);

const baseline = loadBaseline();
if (!baseline) {
  warnings.push(
    formatFinding(
      "warning",
      "source health baseline is missing; run node scripts/check_source_health.mjs --write-baseline",
    ),
  );
} else {
  const current = new Map(records.map((record) => [record.path, record.lines]));
  for (const [file, previousLines] of Object.entries(baseline.files)) {
    const currentLines = current.get(file);
    if (currentLines === undefined) continue;
    const allowed =
      previousLines +
      Math.max(growthFloorLines, Math.ceil(previousLines * growthRatio));
    if (currentLines > allowed) {
      console.log(
        formatFinding(
          "warning",
          `${file}: grew from ${previousLines} to ${currentLines} lines (advisory limit ${allowed})`,
        ),
      );
    }
  }
  for (const record of records) {
    if (record.lines < fileWarningLines) continue;
    if (baseline.files[record.path] === undefined) {
      console.log(
        formatFinding(
          "warning",
          `${record.path}: new file at ${record.lines} lines; confirm its responsibility boundary`,
        ),
      );
    }
  }
}

if (errors.length > 0) process.exitCode = 1;
