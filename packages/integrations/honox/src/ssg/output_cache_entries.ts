import { lstat } from "node:fs/promises";
import { join } from "node:path";
import {
  assertSafeLogicalOutputPath,
  ensureOutputCacheEntriesDirectory,
  isSafeLogicalOutputPath,
  isSafeOutputCacheEntriesDirectory,
  outputCacheEntriesPath,
  outputCacheEntryName,
  resolveOutputCacheFile,
} from "./output_cache_paths.js";
import {
  checksumFile,
  replaceOutputCacheEntry,
} from "./output_cache_replace.js";
import {
  type OutputCacheEntry,
  outputCacheValidationConcurrency,
} from "./output_cache_types.js";
import { isChecksum } from "./output_cache_validate.js";
import { measure } from "./runtime_metrics.js";

export async function saveOutputCacheEntries(
  directory: string,
  outputDirectory: string,
  outputs: Readonly<Record<string, OutputCacheEntry>>,
  finalOutputInventory: Readonly<Record<string, string>> | undefined,
  timingsMs: Record<string, number> | undefined,
): Promise<Record<string, OutputCacheEntry>> {
  await ensureOutputCacheEntriesDirectory(directory);
  const entries: Record<string, OutputCacheEntry> = {};
  for (const outputPath of Object.keys(outputs).sort()) {
    assertSafeLogicalOutputPath(outputPath);
    const existing = outputs[outputPath];
    if (existing.cachePath && existing.checksum) {
      if (
        existing.cachePath !== outputCacheEntryName(outputPath) ||
        !isChecksum(existing.checksum)
      ) {
        throw new Error(`Invalid SSG output cache entry: ${outputPath}`);
      }
      const cached = await existingOutputCacheEntry(
        existing,
        join(directory, existing.cachePath),
      );
      if (cached) {
        entries[outputPath] = cached;
        continue;
      }
    }
    const source = resolveOutputCacheFile(outputDirectory, outputPath);
    const cachePath = outputCacheEntryName(outputPath);
    const destination = join(directory, cachePath);
    await replaceOutputCacheEntry(source, destination, timingsMs);
    const checksum = finalOutputInventory?.[outputPath];
    if (!checksum) {
      const cachedChecksum = await checksumFile(destination);
      if (!cachedChecksum) {
        throw new Error(`Could not checksum cached output: ${outputPath}`);
      }
      entries[outputPath] = await withOutputCacheEntryStat(
        { cachePath, checksum: cachedChecksum },
        destination,
      );
      continue;
    }
    entries[outputPath] = await withOutputCacheEntryStat(
      { cachePath, checksum },
      destination,
    );
  }
  return entries;
}

export async function withOutputCacheEntryStat(
  entry: OutputCacheEntry,
  path: string,
): Promise<OutputCacheEntry> {
  const info = await lstat(path).catch(() => undefined);
  if (!info?.isFile() || info.isSymbolicLink()) return entry;
  return { ...entry, size: info.size, modifiedAtMs: info.mtimeMs };
}

export async function existingOutputCacheEntry(
  entry: OutputCacheEntry,
  path: string,
): Promise<OutputCacheEntry | undefined> {
  const info = await lstat(path).catch(() => undefined);
  if (!info?.isFile() || info.isSymbolicLink()) return undefined;
  return { ...entry, size: info.size, modifiedAtMs: info.mtimeMs };
}

export async function validateOutputCacheEntries(
  outputCachePath: string,
  entries: Readonly<Record<string, OutputCacheEntry>>,
  timingsMs?: Record<string, number>,
): Promise<boolean> {
  try {
    const directory = outputCacheEntriesPath(outputCachePath);
    if (!(await isSafeOutputCacheEntriesDirectory(directory))) return false;
    const entriesToValidate = Object.entries(entries);
    let nextEntryIndex = 0;
    let valid = true;
    const validateEntry = async (): Promise<void> => {
      while (valid) {
        const next = entriesToValidate[nextEntryIndex++];
        if (!next) return;
        const [outputPath, entry] = next;
        if (
          !isSafeLogicalOutputPath(outputPath) ||
          entry.cachePath !== outputCacheEntryName(outputPath) ||
          !isChecksum(entry.checksum)
        ) {
          valid = false;
          return;
        }
        const path = resolveOutputCacheFile(directory, entry.cachePath);
        const info = await lstat(path).catch(() => undefined);
        if (!info?.isFile() || info.isSymbolicLink()) {
          valid = false;
          return;
        }
        if (entry.size === info.size && entry.modifiedAtMs === info.mtimeMs) {
          continue;
        }
        if (
          (await measure(timingsMs, "outputCacheEntryChecksum", () =>
            checksumFile(path),
          )) !== entry.checksum
        ) {
          valid = false;
          return;
        }
        entry.size = info.size;
        entry.modifiedAtMs = info.mtimeMs;
      }
    };
    await Promise.all(
      Array.from(
        {
          length: Math.min(
            outputCacheValidationConcurrency,
            entriesToValidate.length,
          ),
        },
        validateEntry,
      ),
    );
    return valid;
  } catch {
    return false;
  }
}
