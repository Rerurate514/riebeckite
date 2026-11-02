#!/usr/bin/env node
// Guards the public API surface of @riebeckite/core. Source symbols are read
// with the TypeScript checker so type-only exports are covered; runtime names
// are read from dist when it exists.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const packageRoot = path.join(repositoryRoot, "packages", "core");
const snapshotPath = path.join(packageRoot, "api.json");

const entryPoints = {
  ".": "index.ts",
  "./client": "client.ts",
  "./cli": "cli.ts",
};

function collectSourceExports(entry) {
  const config = ts.readConfigFile(
    path.join(packageRoot, "tsconfig.json"),
    ts.sys.readFile,
  );
  const parsed = ts.parseJsonConfigFileContent(
    config.config ?? {},
    ts.sys,
    packageRoot,
  );
  const program = ts.createProgram({
    rootNames: [path.join(packageRoot, entry)],
    options: { ...parsed.options, noEmit: true },
  });
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(path.join(packageRoot, entry));
  const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) return [];
  return checker
    .getExportsOfModule(moduleSymbol)
    .map((symbol) => {
      const flags = symbol.getFlags();
      const names = [symbol.getName()];
      const target =
        symbol.flags & ts.SymbolFlags.Alias
          ? checker.getAliasedSymbol(symbol)
          : symbol;
      const targetFlags = target.getFlags();
      const value =
        (targetFlags & ts.SymbolFlags.Value) !== 0 ||
        (flags & ts.SymbolFlags.Value) !== 0;
      const type =
        (targetFlags & ts.SymbolFlags.Type) !== 0 ||
        (flags & ts.SymbolFlags.Type) !== 0;
      return { name: names[0], value, type };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function collectRuntimeExports(entry) {
  const distFile = path.join(
    packageRoot,
    "dist",
    entry.replace(/\.ts$/, ".js"),
  );
  if (!fs.existsSync(distFile)) return undefined;
  const module = await import(
    new URL(`file://${distFile.replace(/\\/g, "/")}`).href
  );
  return new Set(Object.keys(module));
}

function readSnapshot() {
  if (!fs.existsSync(snapshotPath)) return undefined;
  return JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
}

async function main() {
  const update = process.argv.includes("--update");
  const snapshot = {};
  for (const [subpath, entry] of Object.entries(entryPoints)) {
    snapshot[subpath] = collectSourceExports(entry);
  }
  const previous = readSnapshot();
  if (update || !previous) {
    fs.writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
    console.log(
      `${update ? "Updated" : "Created"} ${path.relative(repositoryRoot, snapshotPath)}`,
    );
    return;
  }

  const errors = [];
  for (const [subpath, exports] of Object.entries(snapshot)) {
    const expected = previous[subpath] ?? [];
    const actualByName = new Map(exports.map((item) => [item.name, item]));
    const expectedByName = new Map(expected.map((item) => [item.name, item]));
    for (const item of expected) {
      const actual = actualByName.get(item.name);
      if (!actual) {
        errors.push(`${subpath}: removed public export "${item.name}"`);
      } else if (actual.value !== item.value || actual.type !== item.type) {
        errors.push(`${subpath}: export "${item.name}" changed kind`);
      }
    }
    for (const item of exports) {
      if (!expectedByName.has(item.name)) {
        errors.push(`${subpath}: added public export "${item.name}"`);
      }
    }
  }

  if (errors.length > 0) {
    console.error("Core API contract changed:");
    for (const error of errors) console.error(`- ${error}`);
    console.error("Run node scripts/check_core_api.mjs --update to accept.");
    process.exitCode = 1;
    return;
  }

  for (const [subpath, entry] of Object.entries(entryPoints)) {
    const runtime = await collectRuntimeExports(entry);
    if (!runtime) continue;
    for (const item of previous[subpath] ?? []) {
      if (!item.value) continue;
      if (!runtime.has(item.name)) {
        errors.push(
          `${subpath}: runtime artifact is missing value export "${item.name}"`,
        );
      }
    }
  }
  if (errors.length > 0) {
    console.error("Core runtime API contract changed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log("Core API contract is unchanged.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
