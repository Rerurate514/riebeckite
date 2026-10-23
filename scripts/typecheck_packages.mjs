// Type-only check across the whole workspace.
//
// `build_package.mjs` runs a per-package TypeScript program for declaration
// emit. This script runs its own programs with noEmit so contributors and CI can
// verify types across the whole workspace without paying for esbuild bundling.
//
// Coverage is deliberately wider than `build_package.mjs`. It used to omit
// `strict`, skip test trees entirely and ignore `apps/web`, which is how the
// twelve real errors already present in production sources went unnoticed. The
// check now runs two workspace-wide tiers plus the app:
//
//   sources: every non-test file under `strict`
//   tests:   test files under `strict` with the fixture-shaped flags relaxed
//   web:     `apps/web` with its own DOM, worker and client typings
//
// Each tier is a single program. Per-package programs re-parsed and re-checked
// the same dependency graph (most packages import `@riebeckite/core`) dozens of
// times, which dominated runtime; sharing one program per tier keeps coverage
// identical while removing that repeated work.
//
// The test tier keeps `allowImportingTsExtensions` (tests import with explicit
// `.ts` specifiers) but relaxes `noImplicitAny`, `strictNullChecks` and
// `noUncheckedIndexedAccess`, because test fixtures intentionally model partial
// and invalid data. Relaxing those three does not make the tier a no-op: it
// still reports assignability, arity, overload, return-type and property
// errors, which is what a green tier is meant to guarantee.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { PACKAGE_DIRECTORIES } from "./package_metadata.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const formatHost = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: () => repositoryRoot,
  getNewLine: () => "\n",
};
const workspaceConfigPath = path.join(repositoryRoot, "tsconfig.json");
const workspaceConfig = ts.getParsedCommandLineOfConfigFile(
  workspaceConfigPath,
  {},
  {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      console.log(ts.formatDiagnostics([diagnostic], formatHost));
    },
  },
);

const ignoredSourceDirectories = new Set([
  "node_modules",
  "dist",
  "templates",
  "__golden__",
]);
const testDirectoryPattern =
  /(^|[\\/])(test|tests|__tests__|spec|__spec__)([\\/]|$)/;

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

function isTestFile(file) {
  return testDirectoryPattern.test(path.relative(repositoryRoot, file));
}

const baseOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  jsxImportSource: "hono/jsx",
  noEmit: true,
  skipLibCheck: true,
  strict: true,
  allowImportingTsExtensions: true,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  resolveJsonModule: true,
  types: ["node"],
  baseUrl: workspaceConfig?.options.baseUrl,
  paths: workspaceConfig?.options.paths,
};

const testOptions = {
  ...baseOptions,
  noImplicitAny: false,
  strictNullChecks: false,
  noUncheckedIndexedAccess: false,
};

function compareDiagnostics(left, right) {
  const leftFile = left.file?.fileName ?? "";
  const rightFile = right.file?.fileName ?? "";
  if (leftFile !== rightFile) return leftFile < rightFile ? -1 : 1;
  const leftStart = left.start ?? -1;
  const rightStart = right.start ?? -1;
  if (leftStart !== rightStart) return leftStart - rightStart;
  return left.code - right.code;
}

function reportErrors(label, program) {
  const errors = ts
    .getPreEmitDiagnostics(program)
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
    .sort(compareDiagnostics);
  if (errors.length === 0) return 0;
  console.log(ts.formatDiagnostics(errors, formatHost));
  console.log(`[typecheck] ${label}: ${errors.length} type error(s)`);
  return errors.length;
}

let totalErrors = 0;
let checked = 0;

const packageFiles = [];
for (const directory of PACKAGE_DIRECTORIES) {
  const absolute = path.join(repositoryRoot, directory);
  if (!fs.existsSync(path.join(absolute, "package.json"))) {
    console.error(`[typecheck] missing package at ${directory}`);
    totalErrors += 1;
    continue;
  }
  packageFiles.push(...collectSourceFiles(absolute));
}

const allFiles = packageFiles.sort();

const sourceFiles = allFiles.filter((file) => !isTestFile(file));
if (sourceFiles.length > 0) {
  totalErrors += reportErrors(
    "sources",
    ts.createProgram(sourceFiles, baseOptions),
  );
  checked += 1;
}

const testFiles = allFiles.filter(isTestFile);
if (testFiles.length > 0) {
  totalErrors += reportErrors(
    "tests",
    ts.createProgram(testFiles, testOptions),
  );
  checked += 1;
}

const webConfigPath = path.join(repositoryRoot, "apps/web/tsconfig.json");
if (fs.existsSync(webConfigPath)) {
  const webConfig = ts.getParsedCommandLineOfConfigFile(
    webConfigPath,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        console.log(ts.formatDiagnostics([diagnostic], formatHost));
      },
    },
  );
  if (webConfig) {
    totalErrors += reportErrors(
      "apps/web",
      ts.createProgram({
        rootNames: webConfig.fileNames,
        options: { ...webConfig.options, noEmit: true },
      }),
    );
    checked += 1;
  }
}

if (totalErrors > 0) {
  console.error(
    `[typecheck] ${totalErrors} type error(s) in ${checked} projects`,
  );
  process.exit(1);
}

console.log(`[typecheck] ${checked} projects OK (no type errors)`);
