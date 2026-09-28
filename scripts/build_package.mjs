
import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";
import ts from "typescript";
import "./copy_license.mjs";

const packageDirectory = process.cwd();
const packageJson = JSON.parse(
  fs.readFileSync(path.join(packageDirectory, "package.json"), "utf8"),
);

function resolveTarget(target) {
  if (typeof target === "string") return target;
  if (!target || typeof target !== "object") return undefined;
  for (const condition of [
    "source",
    "import",
    "default",
    "module",
    "require",
    "types",
  ]) {
    if (condition in target) {
      const resolved = resolveTarget(target[condition]);
      if (resolved) return resolved;
    }
  }
  for (const value of Object.values(target)) {
    const resolved = resolveTarget(value);
    if (resolved) return resolved;
  }
  return undefined;
}

const entries = [];
const seen = new Set();
function addEntry(target) {
  if (typeof target !== "string") return;
  const source = target.replace(/^\.\//, "");
  if (!/\.(ts|tsx)$/.test(source) || seen.has(source)) return;
  seen.add(source);
  entries.push({ in: source, out: source.replace(/\.(ts|tsx)$/, "") });
}

for (const target of Object.values(packageJson.exports ?? {})) {
  addEntry(resolveTarget(target) ?? target);
}
for (const target of Object.values(packageJson.bin ?? {})) {
  if (typeof target !== "string") continue;
  if (/\.(ts|tsx)$/.test(target)) {
    addEntry(target);
    continue;
  }
  const match = target.match(/^\.\/dist\/(.+)\.js$/);
  if (!match) continue;
  for (const extension of [".ts", ".tsx"]) {
    const candidate = `./${match[1]}${extension}`;
    if (fs.existsSync(path.join(packageDirectory, candidate))) {
      addEntry(candidate);
      break;
    }
  }
}

if (entries.length === 0) {
  console.log(`[${packageJson.name}] no JavaScript entry points to build`);
  process.exit(0);
}

fs.rmSync(path.join(packageDirectory, "dist"), {
  recursive: true,
  force: true,
});

await esbuild.build({
  entryPoints: entries,
  outdir: "dist",
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "esnext",
  packages: "external",
  external: ["@riebeckite/*"],
  jsx: "automatic",
  jsxImportSource: "hono/jsx",
  charset: "utf8",
  logLevel: "warning",
});

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
    else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith(".d.ts")
    ) {
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
  declaration: true,
  emitDeclarationOnly: true,
  outDir: path.join(packageDirectory, "dist"),
  rootDir: packageDirectory,
  skipLibCheck: true,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  resolveJsonModule: true,
  types: ["node"],
};

const program = ts.createProgram(collectSourceFiles(packageDirectory), options);
const emitResult = program.emit();
const errors = ts
  .getPreEmitDiagnostics(program)
  .concat(emitResult.diagnostics)
  .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);

if (errors.length > 0) {
  console.log(
    ts.formatDiagnostics(errors, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => packageDirectory,
      getNewLine: () => "\n",
    }),
  );
  console.log(`[${packageJson.name}] ${errors.length} declaration error(s)`);
}

if (emitResult.emitSkipped) {
  console.error(`[${packageJson.name}] declaration emit was skipped`);
  process.exit(1);
}

console.log(
  `[${packageJson.name}] built ${entries.length} entry point(s) + declarations`,
);
