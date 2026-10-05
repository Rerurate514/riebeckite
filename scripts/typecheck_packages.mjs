// Type-only check across every publishable package.
//
// `build_package.mjs` runs a per-package TypeScript program for declaration
// emit. This script runs its own programs with noEmit so contributors and CI can
// verify types across the whole workspace without paying for esbuild bundling.
//
// Coverage is deliberately wider than `build_package.mjs`. It used to omit
// `strict`, skip test trees entirely and ignore `apps/web`, which is how the
// twelve real errors already present in production sources went unnoticed. The
// check now runs two tiers per package:
//
//   sources: every non-test file under `strict`
//   tests:   test files under `strict` with the fixture-shaped flags relaxed
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
};

const testOptions = {
  ...baseOptions,
  noImplicitAny: false,
  strictNullChecks: false,
  noUncheckedIndexedAccess: false,
};

const formatHost = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: () => repositoryRoot,
  getNewLine: () => "\n",
};

function reportErrors(label, program) {
  const errors = ts
    .getPreEmitDiagnostics(program)
    .filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    );
  if (errors.length === 0) return 0;
  console.log(ts.formatDiagnostics(errors, formatHost));
  console.log(`[typecheck] ${label}: ${errors.length} type error(s)`);
  return errors.length;
}

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

  const sourceFiles = files.filter((file) => !isTestFile(file));
  if (sourceFiles.length > 0) {
    totalErrors += reportErrors(
      `${packageJson.name} (sources)`,
      ts.createProgram(sourceFiles, baseOptions),
    );
    checked += 1;
  }

  const testFiles = files.filter((file) => isTestFile(file));
  if (testFiles.length > 0) {
    totalErrors += reportErrors(
      `${packageJson.name} (tests)`,
      ts.createProgram(testFiles, testOptions),
    );
    checked += 1;
  }
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
