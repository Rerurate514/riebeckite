#!/usr/bin/env node
// Fails when a source file uses a double type assertion (`x as unknown as T`).
// A double assertion switches off the type checker for that expression, so it
// hides real mistakes. The repository keeps a small allowlist for the few
// places that still need one, and every entry has to be justified here.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const sourceExtensions = new Set([".ts", ".tsx", ".mts", ".cts"]);

const ignoredDirectories = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  "templates",
  "__golden__",
  ".git",
  ".riebeckite",
  ".wrangler",
]);

const scanRoots = ["packages", "website", "tests"];

// Files that still need a double assertion, with the number of occurrences
// that is allowed. Remove an entry as soon as the cast can be replaced by a
// real type check.
const allowedAssertions = new Map();

function collectSourceFiles(directory) {
  const files = [];
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name) || entry.name.startsWith(".")) {
      continue;
    }
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectSourceFiles(full));
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

function findDoubleAssertions(fileName) {
  const text = fs.readFileSync(fileName, "utf8");
  const source = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found = [];
  const visit = (node) => {
    if (
      ts.isAsExpression(node) &&
      ts.isAsExpression(node.parent) &&
      node.parent.expression === node &&
      node.type.kind === ts.SyntaxKind.UnknownKeyword
    ) {
      const { line, character } = source.getLineAndCharacterOfPosition(
        node.getStart(source),
      );
      found.push({ line: line + 1, column: character + 1 });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

const violations = [];
for (const root of scanRoots) {
  for (const file of collectSourceFiles(path.join(repositoryRoot, root))) {
    const relative = path.relative(repositoryRoot, file).replace(/\\/g, "/");
    const found = findDoubleAssertions(file);
    if (found.length === 0) continue;
    const allowed = allowedAssertions.get(relative) ?? 0;
    if (found.length > allowed) {
      for (const position of found.slice(allowed)) {
        violations.push(
          `${relative}:${position.line}:${position.column} double type assertion`,
        );
      }
    } else if (found.length < allowed) {
      violations.push(
        `${relative}: allowlist expects ${allowed} double type assertion(s), found ${found.length}`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error("Double type assertions found:");
  for (const violation of violations) console.error(`- ${violation}`);
  console.error(
    "Replace `as unknown as` with a real type check, a single assertion, or a validated parser.",
  );
  process.exit(1);
}

console.log(
  `No double type assertions found (${allowedAssertions.size} allowlisted file(s)).`,
);
