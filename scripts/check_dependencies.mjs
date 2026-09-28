#!/usr/bin/env node
// Detects imports that rely on undeclared or hoisted dependencies.
// A package must declare every bare module specifier it imports; relying on a
// transitive/hoisted install works in a monorepo but breaks isolated consumers.
import fs from "node:fs";
import { builtinModules } from "node:module";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const builtins = new Set(
  builtinModules.flatMap((name) => [name, `node:${name}`]),
);

const ignoredDirectories = new Set([
  "node_modules",
  "dist",
  ".riebeckite",
  ".wrangler",
  ".git",
  "coverage",
]);

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

const specifierPatterns = [
  /^[ \t]*import\b[^;]*?\bfrom\s*["']([^"']+)["']/gm,
  /^[ \t]*export\s+(?:\*(?:\s+as\s+\w+)?|\{[^}]*\}|type\s*\{[^}]*\})\s*from\s*["']([^"']+)["']/gm,
  /^[ \t]*import\s*["']([^"']+)["']/gm,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
];

function walk(directory) {
  const files = [];
  const stack = [directory];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) {
          stack.push(path.join(current, entry.name));
        }
        continue;
      }
      if (sourceExtensions.has(path.extname(entry.name))) {
        files.push(path.join(current, entry.name));
      }
    }
  }
  return files;
}

function extractSpecifiers(contents) {
  const specifiers = [];
  for (const pattern of specifierPatterns) {
    for (const match of contents.matchAll(pattern)) {
      specifiers.push(match[1]);
    }
  }
  return specifiers;
}

function packageName(specifier) {
  const segments = specifier.split("/");
  return specifier.startsWith("@")
    ? `${segments[0]}/${segments[1] ?? ""}`
    : segments[0];
}

function declaredDependencies(manifest) {
  return new Set([
    manifest.name,
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
  ]);
}

function isAllowed(specifier, declared) {
  if (
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    specifier.startsWith("node:") ||
    specifier.startsWith("virtual:") ||
    specifier.startsWith("data:")
  ) {
    return true;
  }
  if (builtins.has(specifier)) return true;
  const name = packageName(specifier);
  return declared.has(name) || declared.has(typesPackageName(name));
}

// `@types/unist` declares the type-only module `unist`; `@types/scope__name`
// declares `@scope/name`.
function typesPackageName(name) {
  return name.startsWith("@")
    ? `@types/${name.slice(1).replace("/", "__")}`
    : `@types/${name}`;
}

function checkPackage(directory) {
  const manifestPath = path.join(directory, "package.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`No package.json found in ${directory}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const declared = declaredDependencies(manifest);
  const violations = [];

  for (const file of walk(directory)) {
    const contents = fs.readFileSync(file, "utf8");
    for (const specifier of extractSpecifiers(contents)) {
      if (isAllowed(specifier, declared)) continue;
      violations.push({
        file: path.relative(directory, file).split(path.sep).join("/"),
        specifier,
        dependency: packageName(specifier),
      });
    }
  }

  return { manifest, violations };
}

const targets = process.argv.slice(2);
const directories =
  targets.length > 0
    ? targets.map((target) => path.resolve(repositoryRoot, target))
    : [path.join(repositoryRoot, "apps/web")];

let failed = false;
for (const directory of directories) {
  const label = path.relative(repositoryRoot, directory) || directory;
  const { violations } = checkPackage(directory);
  if (violations.length === 0) {
    console.log(`${label}: all imports are declared.`);
    continue;
  }
  failed = true;
  console.error(
    `${label}: ${violations.length} undeclared import(s) rely on hoisted dependencies:`,
  );
  for (const violation of violations) {
    console.error(
      `- ${violation.file}: imports "${violation.specifier}" but does not declare "${violation.dependency}"`,
    );
  }
}

if (failed) process.exitCode = 1;
