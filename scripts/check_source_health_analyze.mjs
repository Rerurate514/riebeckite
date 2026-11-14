import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { repositoryRoot } from "./check_source_health_config.mjs";
import {
  addDirectoryEdge,
  collectDynamicSpecifiers,
  functionName,
  isFunctionLike,
  isTypeOnly,
  lineCount,
  lineOf,
  moduleSpecifier,
  resolveLocalImport,
  scriptKind,
  toPosix,
} from "./check_source_health_files.mjs";
import {
  forbiddenBrowserImport,
  forbiddenCoreImport,
  forbiddenIntegrationImport,
  forbiddenPluginImport,
  forbiddenThemeImport,
  isBrowserFile,
  isPackageSpecifier,
  packageRootFor,
} from "./check_source_health_rules.mjs";

export function findCycles(graph) {
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
      component.length === 1 && [...(graph.get(node) ?? [])].includes(node);
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

export function formatFinding(kind, message) {
  return `[${kind}] ${message}`;
}

export function analyze(files, root = repositoryRoot) {
  const fileSet = new Set(files);
  const records = [];
  const functions = [];
  const graph = new Map();
  const directoryGraph = new Map();
  const errors = [];
  const warnings = [];

  for (const file of files) {
    const relative = toPosix(path.relative(root, file));
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
        if (target) {
          localImports.push(target);
          addDirectoryEdge(directoryGraph, file, target);
        }
      }
      if (isPackageSpecifier(specifier)) {
        const packageRoot = packageRootFor(file, root);
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
        if (
          packageRoot?.startsWith("packages/themes/") &&
          forbiddenThemeImport(specifier)
        ) {
          errors.push(
            formatFinding(
              "error",
              `${relative}: Theme must not depend on "${specifier}"`,
            ),
          );
        }
        if (isBrowserFile(relative) && forbiddenBrowserImport(specifier)) {
          errors.push(
            formatFinding(
              "error",
              `${relative}: Browser/Worker code must not depend on "${specifier}"`,
            ),
          );
        }
      }
    }

    for (const specifier of collectDynamicSpecifiers(sourceFile)) {
      const target = resolveLocalImport(file, specifier, fileSet);
      if (target) {
        localImports.push(target);
        addDirectoryEdge(directoryGraph, file, target);
      }
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

  // Module-level cycles are errors. Directory-level cycles are advisory: two
  // collaborating subsystems can reference each other through distinct modules
  // while the module graph stays acyclic.
  for (const cycle of findCycles(directoryGraph)) {
    const relative = cycle.map((directory) =>
      toPosix(path.relative(root, directory)),
    );
    warnings.push(
      formatFinding(
        "warning",
        `directory dependency cycle: ${relative.join(" -> ")} -> ${relative[0]}`,
      ),
    );
  }

  return { records, functions, errors, warnings };
}
