import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
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

export async function fingerprintDirectory(directory: string): Promise<string> {
  const inventory = await fingerprintOutputDirectory(directory);
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
