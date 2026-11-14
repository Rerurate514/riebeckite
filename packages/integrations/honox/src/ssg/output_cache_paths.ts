import { createHash } from "node:crypto";
import { lstat, mkdir, readFile } from "node:fs/promises";
import {
  isAbsolutePath,
  isNotFoundError,
  resolveWithinDirectory,
} from "./file_system.js";
import type { OutputCacheEntry } from "./output_cache_types.js";

export function outputCacheEntriesPath(outputCachePath: string): string {
  return outputCachePath.replace(/\.json$/, ".entries");
}

export async function decodeOutput(
  outputCachePath: string,
  entry: OutputCacheEntry,
): Promise<Uint8Array> {
  const file = resolveOutputCacheFile(
    outputCacheEntriesPath(outputCachePath),
    entry.cachePath,
  );
  const content = await readFile(file);
  const checksum = createHash("sha256").update(content).digest("hex");
  if (checksum !== entry.checksum) {
    throw new Error("SSG output cache entry checksum mismatch.");
  }
  return content;
}

export function resolveOutputCacheEntryPath(
  outputCachePath: string,
  entry: OutputCacheEntry,
): string {
  return resolveOutputCacheFile(
    outputCacheEntriesPath(outputCachePath),
    entry.cachePath,
  );
}

export function resolveOutputCacheFile(
  directory: string,
  relativePath: string,
): string {
  return resolveWithinDirectory(
    directory,
    relativePath,
    "SSG output cache path",
  );
}

export function isSafeLogicalOutputPath(path: unknown): path is string {
  if (
    typeof path !== "string" ||
    !path ||
    path.includes("\\") ||
    path.includes("\0") ||
    isAbsolutePath(path)
  ) {
    return false;
  }
  try {
    resolveOutputCacheFile("/riebeckite-output-root", path);
    return true;
  } catch {
    return false;
  }
}

export function assertSafeLogicalOutputPath(path: string): void {
  if (!isSafeLogicalOutputPath(path)) {
    throw new Error(`Invalid SSG output path: ${path}`);
  }
}

export function outputCacheEntryName(outputPath: string): string {
  return createHash("sha256").update(outputPath).digest("hex");
}

export async function ensureOutputCacheEntriesDirectory(
  directory: string,
): Promise<void> {
  await mkdir(directory, { recursive: true });
  if (!(await isSafeOutputCacheEntriesDirectory(directory))) {
    throw new Error(`Unsafe SSG output cache entries directory: ${directory}`);
  }
}

export async function isSafeOutputCacheDirectory(
  directory: string,
): Promise<boolean> {
  try {
    const info = await lstat(directory);
    return info.isDirectory() && !info.isSymbolicLink();
  } catch {
    return false;
  }
}

export async function isSafeCacheFileTarget(path: string): Promise<boolean> {
  try {
    return !(await lstat(path)).isSymbolicLink();
  } catch (error) {
    return isNotFoundError(error);
  }
}

export async function isSafeOutputCacheEntriesDirectory(
  directory: string,
): Promise<boolean> {
  return isSafeOutputCacheDirectory(directory);
}

export async function isRegularFile(path: string): Promise<boolean> {
  try {
    const info = await lstat(path);
    return info.isFile() && !info.isSymbolicLink();
  } catch {
    return false;
  }
}
