// Type-only check across every publishable package.
//
// `build_package.mjs` already runs a per-package TypeScript program for
// declaration emit and now fails the build on type errors. This script runs the
// same program with noEmit so contributors and CI can verify types across the
// whole workspace without paying for esbuild bundling.
//
// Scope mirrors `build_package.mjs`: source files under each package directory,
// excluding node_modules / dist / test trees. Editor projects (apps/web, which
// depends on Vite virtual modules) are intentionally outside this check.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { PACKAGE_DIRECTORIES } from "./package_metadata.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const ignoredSourceDirectories = new Set([
  "node_modules",
  "dist",
  "test",
  "tests",
  "__tests__",
  "spec",
  "__spec__",
]);

function collectSourceFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (
      ignoredSourceDirectories.has(entry.name) ||
      entry.name.startsWith(".")
    ) {
      continue;
    }
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectSourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      files.push(full);
    }
  }
  return files;
}

const options = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  jsxImportSource: "hono/jsx",
  noEmit: true,
  skipLibCheck: true,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  resolveJsonModule: true,
  types: ["node"],
};

let totalErrors = 0;
let checked = 0;

for (const directory of PACKAGE_DIRECTORIES) {
  const absolute = path.join(repositoryRoot, directory);
  if (!fs.existsSync(path.join(absolute, "package.json"))) {
    console.error(`[typecheck] missing package at ${directory}`);
    totalErrors += 1;
    continue;
  }
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(absolute, "package.json"), "utf8"),
  );
  const files = collectSourceFiles(absolute);
  if (files.length === 0) continue;

  const program = ts.createProgram(files, options);
  const errors = ts
    .getPreEmitDiagnostics(program)
    .filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    );

  checked += 1;
  if (errors.length === 0) continue;

  console.log(
    ts.formatDiagnostics(errors, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => absolute,
      getNewLine: () => "\n",
    }),
  );
  console.log(`[${packageJson.name}] ${errors.length} type error(s)`);
  totalErrors += errors.length;
}

if (totalErrors > 0) {
  console.error(
    `[typecheck] ${totalErrors} type error(s) across ${PACKAGE_DIRECTORIES.length} packages`,
  );
  process.exit(1);
}

console.log(`[typecheck] ${checked} packages OK (no type errors)`);
