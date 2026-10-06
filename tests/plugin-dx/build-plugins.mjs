// Minimal third-party plugin build: bundle the JS entry points declared in
// `exports` and emit declaration files next to them. This is the build a
// Plugin author outside the repository has to supply themselves; the
// repository's `scripts/build_package.mjs` is not published.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import ts from "typescript";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));

function readManifest(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
}

function jsEntryPoints(dir, manifest) {
  const entryPoints = {};
  for (const [subpath, target] of Object.entries(manifest.exports ?? {})) {
    if (typeof target === "string" || !target.source) continue;
    if (!target.source.endsWith(".ts") || target.source.endsWith(".d.ts")) {
      continue;
    }
    const name =
      subpath === "."
        ? "index"
        : subpath.replace(/^\.\//, "").replace(/\//g, "-");
    entryPoints[name] = path.join(dir, target.source);
  }
  return entryPoints;
}

function declarationRoots(dir, manifest) {
  const roots = [];
  for (const target of Object.values(manifest.exports ?? {})) {
    if (typeof target === "string" || !target.source) continue;
    if (target.source.endsWith(".ts"))
      roots.push(path.join(dir, target.source));
  }
  return roots;
}

function emitDeclarations(dir, rootNames) {
  const options = {
    declaration: true,
    emitDeclarationOnly: true,
    outDir: path.join(dir, "dist"),
    rootDir: dir,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ESNext,
    lib: ["lib.esnext.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
    jsx: ts.JsxEmit.ReactJSX,
    jsxImportSource: "hono/jsx",
    strict: true,
    skipLibCheck: true,
    types: ["node"],
  };
  const program = ts.createProgram(rootNames, options);
  const emitResult = program.emit();
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);
  const errors = diagnostics.filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length > 0) {
    throw new Error(
      ts.formatDiagnostics(errors, {
        getCanonicalFileName: (file) => file,
        getCurrentDirectory: () => fixtureRoot,
        getNewLine: () => "\n",
      }),
    );
  }
}

async function build(dir) {
  const manifest = readManifest(dir);
  await esbuild.build({
    entryPoints: jsEntryPoints(dir, manifest),
    outdir: path.join(dir, "dist"),
    bundle: true,
    format: "esm",
    platform: "neutral",
    packages: "external",
    external: ["@riebeckite/*"],
    jsx: "automatic",
    jsxImportSource: "hono/jsx",
    sourcemap: false,
    logLevel: "warning",
  });
  emitDeclarations(dir, declarationRoots(dir, manifest));
  console.log(`built ${manifest.name}`);
}

const targets = process.argv.slice(2);
const dirs =
  targets.length > 0
    ? targets.map((target) => path.resolve(process.cwd(), target))
    : fs
        .readdirSync(path.join(fixtureRoot, "plugins"))
        .map((name) => path.join(fixtureRoot, "plugins", name));

for (const dir of dirs) {
  await build(dir);
}
