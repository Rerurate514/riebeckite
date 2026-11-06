import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { performance } from "node:perf_hooks";
import { isMissingDirectoryError } from "./file_system.js";
import type { NoChangeFastPathOutputMetrics } from "./types.js";

const APP_FINGERPRINT_IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".riebeckite",
  "dist",
]);

const APP_FINGERPRINT_CONFIG_FILES = [
  "riebeckite.config.ts",
  "riebeckite.config.mts",
  "riebeckite.config.cts",
  "riebeckite.config.js",
  "riebeckite.config.mjs",
  "riebeckite.config.cjs",
];

export async function computeAppFingerprint(
  root: string,
  configFile: string | undefined,
): Promise<string> {
  const files: string[] = [];
  await collectAppFiles(join(root, "app"), files);
  if (configFile) files.push(configFile);
  for (const name of APP_FINGERPRINT_CONFIG_FILES) {
    files.push(join(root, name));
  }
  files.sort();
  const hash = createHash("sha256");
  for (const file of files) {
    let content: Buffer;
    try {
      content = await readFile(file);
    } catch {
      continue;
    }
    hash.update(relative(root, file).replaceAll("\\", "/"));
    hash.update("\0");
    hash.update(content);
    hash.update("\0");
  }
  return hash.digest("hex");
}

export async function computeBundleFingerprint(
  root: string,
  configFile: string | undefined,
): Promise<string> {
  const hash = createHash("sha256");
  hash.update(await computeAppFingerprint(root, configFile));
  const files = [
    ...(await findBundleInputFiles(root)),
    ...(await findLocalPackageInputFiles(root)),
  ].sort();
  for (const file of files) {
    try {
      hash
        .update(file)
        .update("\0")
        .update(await readFile(file))
        .update("\0");
    } catch {}
  }
  for (const [name, value] of Object.entries(process.env)
    .filter(([name]) => name === "NODE_ENV" || name.startsWith("VITE_"))
    .sort(([left], [right]) => left.localeCompare(right))) {
    if (value === undefined) continue;
    hash.update(name).update("\0").update(value).update("\0");
  }
  return hash.digest("hex");
}

export async function fingerprintDirectory(directory: string): Promise<string> {
  return fingerprintOutputInventory(
    await fingerprintOutputDirectory(directory),
  );
}

export function fingerprintOutputInventory(
  inventory: Readonly<Record<string, string>>,
): string {
  const hash = createHash("sha256");
  for (const [path, checksum] of Object.entries(inventory).sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    hash.update(path).update("\0").update(checksum).update("\0");
  }
  return hash.digest("hex");
}

export async function fingerprintOutputDirectory(
  directory: string,
  relativeDirectory = "",
  metrics?: NoChangeFastPathOutputMetrics,
): Promise<Record<string, string>> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    (error: unknown) => {
      if (isMissingDirectoryError(error)) return undefined;
      throw error;
    },
  );
  if (!entries) return {};
  const inventory: Record<string, string> = {};
  for (const entry of entries) {
    const file = join(directory, entry.name);
    const relativePath = join(relativeDirectory, entry.name).replaceAll(
      "\\",
      "/",
    );
    if (entry.isDirectory()) {
      Object.assign(
        inventory,
        await fingerprintOutputDirectory(file, relativePath, metrics),
      );
      continue;
    }
    if (entry.isFile()) {
      const hashedAt = performance.now();
      const content = await readFile(file);
      inventory[relativePath] = createHash("sha256")
        .update(content)
        .digest("hex");
      if (metrics) {
        metrics.outputHashValidationDurationMs += performance.now() - hashedAt;
        metrics.outputFilesHashed += 1;
        metrics.outputBytesHashed += content.length;
      }
    }
  }
  return inventory;
}

export function inventoriesEqual(
  left: Record<string, string>,
  right: Record<string, string>,
): boolean {
  const leftPaths = Object.keys(left);
  const rightPaths = Object.keys(right);
  return (
    leftPaths.length === rightPaths.length &&
    leftPaths.every((path) => left[path] === right[path])
  );
}

async function collectAppFiles(
  directory: string,
  files: string[],
): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    () => undefined,
  );
  if (!entries) return;
  for (const entry of entries) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (APP_FINGERPRINT_IGNORED_DIRECTORIES.has(entry.name)) continue;
      await collectAppFiles(full, files);
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
}

async function findBundleInputFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  for (let directory = root; ; directory = dirname(directory)) {
    for (const name of [
      "package.json",
      "pnpm-lock.yaml",
      "package-lock.json",
      "yarn.lock",
    ]) {
      files.push(join(directory, name));
    }
    const parent = dirname(directory);
    if (parent === directory) return files;
  }
}

async function findLocalPackageInputFiles(root: string): Promise<string[]> {
  const packageFile = join(root, "package.json");
  let packageSource: string;
  try {
    packageSource = await readFile(packageFile, "utf8");
  } catch {
    return [];
  }
  let packageJson: unknown;
  try {
    packageJson = JSON.parse(packageSource);
  } catch {
    return [];
  }
  if (!packageJson || typeof packageJson !== "object") return [];
  const files: string[] = [];
  const workspaceDependencies = new Set<string>();
  for (const dependencyGroup of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
  ]) {
    const dependencies = (packageJson as Record<string, unknown>)[
      dependencyGroup
    ];
    if (!dependencies || typeof dependencies !== "object") continue;
    for (const [name, specifier] of Object.entries(dependencies)) {
      if (typeof specifier !== "string") continue;
      const directory = localPackageDirectory(root, specifier);
      if (directory) {
        await collectPackageFiles(directory, files);
        continue;
      }
      if (specifier.startsWith("workspace:")) workspaceDependencies.add(name);
    }
  }
  const workspaceRoot = await findWorkspaceRoot(root);
  if (workspaceRoot && workspaceDependencies.size > 0) {
    for (const directory of await findWorkspacePackageDirectories(
      workspaceRoot,
      workspaceDependencies,
    )) {
      await collectPackageFiles(directory, files);
    }
  }
  return files;
}

function localPackageDirectory(
  root: string,
  specifier: string,
): string | undefined {
  if (specifier.startsWith("file:")) return join(root, specifier.slice(5));
  if (specifier.startsWith("link:")) return join(root, specifier.slice(5));
  return undefined;
}

async function findWorkspaceRoot(root: string): Promise<string | undefined> {
  for (let directory = root; ; directory = dirname(directory)) {
    try {
      await readFile(join(directory, "pnpm-workspace.yaml"));
      return directory;
    } catch {}
    const parent = dirname(directory);
    if (parent === directory) return undefined;
  }
}

async function findWorkspacePackageDirectories(
  directory: string,
  names: ReadonlySet<string>,
): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    () => [],
  );
  const matches: string[] = [];
  for (const entry of entries) {
    if (
      !entry.isDirectory() ||
      APP_FINGERPRINT_IGNORED_DIRECTORIES.has(entry.name)
    )
      continue;
    const child = join(directory, entry.name);
    try {
      const packageJson = JSON.parse(
        await readFile(join(child, "package.json"), "utf8"),
      ) as {
        name?: unknown;
      };
      if (typeof packageJson.name === "string" && names.has(packageJson.name)) {
        matches.push(child);
        continue;
      }
    } catch {}
    matches.push(...(await findWorkspacePackageDirectories(child, names)));
  }
  return matches;
}

async function collectPackageFiles(
  directory: string,
  files: string[],
): Promise<void> {
  files.push(join(directory, "package.json"));
  await collectAppFiles(directory, files);
}
