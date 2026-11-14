import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  copyFile,
  lstat,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import {
  isRegularFile,
  isSafeOutputCacheEntriesDirectory,
} from "./output_cache_paths.js";
import type { OutputCacheEntry } from "./output_cache_types.js";
import { measure } from "./runtime_metrics.js";

export async function checksumFile(path: string): Promise<string | undefined> {
  const hash = createHash("sha256");
  try {
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    return hash.digest("hex");
  } catch {
    return undefined;
  }
}

export async function replaceFile(
  temporaryPath: string,
  targetPath: string,
): Promise<void> {
  try {
    await rename(temporaryPath, targetPath);
  } catch (error) {
    if (!isReplacementFailure(error)) throw error;
    await rm(targetPath, { force: true });
    await rename(temporaryPath, targetPath);
  }
}

export function isReplacementFailure(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  const code = String(error.code);
  return code === "EPERM" || code === "EEXIST" || code === "EACCES";
}

export async function replaceOutputCacheEntry(
  source: string,
  destination: string,
  timingsMs?: Record<string, number>,
): Promise<void> {
  if ((await lstat(destination).catch(() => undefined))?.isSymbolicLink()) {
    throw new Error(`Unsafe SSG output cache entry: ${destination}`);
  }
  const temporaryPath = `${destination}.${randomUUID()}.tmp`;
  try {
    await measure(timingsMs, "outputCacheEntryWrite", () =>
      writeFile(temporaryPath, new Uint8Array()),
    );
    await measure(timingsMs, "outputCacheEntryCopy", () =>
      copyFile(source, temporaryPath),
    );
    await measure(timingsMs, "outputCacheEntryRename", () =>
      replaceFile(temporaryPath, destination),
    );
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function collectUnreferencedOutputCacheEntries(
  directory: string,
  outputs: Readonly<Record<string, OutputCacheEntry>>,
  timingsMs?: Record<string, number>,
): Promise<void> {
  try {
    if (!(await isSafeOutputCacheEntriesDirectory(directory))) return;
    const referenced = new Set(
      Object.values(outputs).map((entry) => entry.cachePath),
    );
    const entries = await measure(timingsMs, "outputCacheGcScan", () =>
      readdir(directory, { withFileTypes: true }),
    );
    for (const entry of entries) {
      if (!/^[a-f0-9]{64}$/u.test(entry.name) || referenced.has(entry.name)) {
        continue;
      }
      const path = join(directory, entry.name);
      if (await isRegularFile(path)) {
        await measure(timingsMs, "outputCacheGcDelete", () =>
          rm(path, { force: true }),
        );
      }
    }
  } catch {
    return;
  }
}
