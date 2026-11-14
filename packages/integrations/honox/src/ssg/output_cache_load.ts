import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { isNotFoundError } from "./file_system.js";
import { validateOutputCacheEntries } from "./output_cache_entries.js";
import {
  isRegularFile,
  isSafeOutputCacheDirectory,
} from "./output_cache_paths.js";
import type { OutputCacheState } from "./output_cache_types.js";
import { isOutputCacheState } from "./output_cache_validate.js";
import { measure, measureSync } from "./runtime_metrics.js";

export async function loadOutputCache(
  path: string,
  timingsMs?: Record<string, number>,
  log: (message: string) => void = () => {},
): Promise<(OutputCacheState & { fileSizeBytes?: number }) | undefined> {
  const cache = await loadOutputCacheMetadata(path, timingsMs, log);
  if (!cache) return undefined;
  if (!(await validateOutputCache(cache, path, timingsMs, log)))
    return undefined;
  return cache;
}

export async function loadOutputCacheMetadata(
  path: string,
  timingsMs?: Record<string, number>,
  log: (message: string) => void = () => {},
): Promise<(OutputCacheState & { fileSizeBytes?: number }) | undefined> {
  if (!(await isSafeOutputCacheDirectory(dirname(path)))) {
    log("SSG output cache directory is unsafe and will be ignored.");
    return undefined;
  }
  if (!(await isRegularFile(path))) {
    return undefined;
  }
  let raw: string;
  try {
    raw = await measure(timingsMs, "outputCacheRead", () =>
      readFile(path, "utf8"),
    );
  } catch (error) {
    if (isNotFoundError(error)) return undefined;
    log(
      `SSG output cache could not be read; the build regenerates every output. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = measureSync(timingsMs, "outputCacheParse", () => JSON.parse(raw));
  } catch (error) {
    log(
      `SSG output cache is corrupted and will be rebuilt. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return undefined;
  }

  if (!isOutputCacheState(parsed)) {
    log("SSG output cache uses an unsupported format and will be rebuilt.");
    return undefined;
  }
  return timingsMs
    ? { ...parsed, fileSizeBytes: Buffer.byteLength(raw) }
    : parsed;
}

export async function validateOutputCache(
  cache: OutputCacheState,
  path: string,
  timingsMs?: Record<string, number>,
  log: (message: string) => void = () => {},
): Promise<boolean> {
  const entriesAreValid = await measure(
    timingsMs,
    "outputCacheEntriesValidate",
    () => validateOutputCacheEntries(path, cache.outputs, timingsMs),
  );
  if (entriesAreValid) return true;
  log("SSG output cache entries are corrupted and will be rebuilt.");
  return false;
}
