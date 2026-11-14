import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ResolvedRiebeckiteConfig } from "../types/resolved_riebeckite_config.js";

export const CONTENT_CACHE_NAMESPACE = "content";

export const CONTENT_CACHE_SCHEMA_VERSION = 5;

export const CONTENT_CACHE_COMPATIBILITY_VERSION = 5;

export function hash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function cacheDirectory(config: ResolvedRiebeckiteConfig): string {
  if (config.cache?.directory) {
    return path.join(config.cache.directory, CONTENT_CACHE_NAMESPACE);
  }
  // Fallback to plugin cache directory resolution
  if (config.buildDirectory) {
    return path.join(config.buildDirectory, "cache", CONTENT_CACHE_NAMESPACE);
  }
  // Fallback to temp directory for tests without explicit cache directory
  return path.join(
    os.tmpdir(),
    "riebeckite-content-cache",
    CONTENT_CACHE_NAMESPACE,
  );
}

export function versionDirectory(baseDir: string): string {
  return path.join(baseDir, `v${CONTENT_CACHE_SCHEMA_VERSION}`);
}

export function cacheFilePath(baseDir: string, key: string): string {
  return path.join(versionDirectory(baseDir), `${hash(key)}.json`);
}

export async function writeAtomically(
  targetPath: string,
  dir: string,
  serialized: string,
): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  const temporaryPath = `${targetPath}.${crypto
    .createHash("sha256")
    .update(`${Date.now()}-${Math.random()}`)
    .digest("hex")
    .slice(0, 12)}.tmp`;

  try {
    await fs.writeFile(temporaryPath, serialized, "utf8");
    await fs.rename(temporaryPath, targetPath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}
