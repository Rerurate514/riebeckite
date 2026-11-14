import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
  ignoredDirectories,
  ignoredFilePattern,
  repositoryRoot,
  sourceExtensions,
  sourceRoots,
} from "./check_source_health_config.mjs";

export function toPosix(value) {
  return value.split(path.sep).join("/");
}

export function walk(directory, files) {
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

export function collectSourceFiles() {
  const files = [];
  for (const root of sourceRoots) {
    const directory = path.join(repositoryRoot, root);
    if (fs.existsSync(directory)) walk(directory, files);
  }
  return files;
}

export function scriptKind(file) {
  if (file.endsWith(".tsx") || file.endsWith(".jsx")) return ts.ScriptKind.TSX;
  if (file.endsWith(".js") || file.endsWith(".mjs") || file.endsWith(".cjs")) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

export function lineCount(text) {
  const lines = text.split(/\r?\n/).length;
  return text.endsWith("\n") || text.endsWith("\r\n") ? lines - 1 : lines;
}

export function lineOf(sourceFile, position) {
  return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
}

export function isFunctionLike(node) {
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

export function functionName(node) {
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

export function moduleSpecifier(statement) {
  if (
    (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
    statement.moduleSpecifier &&
    ts.isStringLiteral(statement.moduleSpecifier)
  ) {
    return statement.moduleSpecifier.text;
  }
  return undefined;
}

export function isTypeOnly(statement) {
  if (ts.isImportDeclaration(statement)) {
    return statement.importClause?.isTypeOnly === true;
  }
  if (ts.isExportDeclaration(statement)) return statement.isTypeOnly;
  return false;
}

export function collectDynamicSpecifiers(sourceFile) {
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

export function resolveLocalImport(file, specifier, fileSet) {
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

export function addDirectoryEdge(graph, from, to) {
  const fromDirectory = path.dirname(from);
  const toDirectory = path.dirname(to);
  if (fromDirectory === toDirectory) return;
  if (!graph.has(fromDirectory)) graph.set(fromDirectory, new Set());
  graph.get(fromDirectory).add(toDirectory);
}
