import { createHash, randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { saveOutputCacheEntries } from "./output_cache_entries.js";
import {
  createFastPathCacheState,
  fastPathCachePath,
  saveFastPathCache,
} from "./output_cache_fastpath.js";
import {
  isSafeCacheFileTarget,
  isSafeOutputCacheDirectory,
  outputCacheEntriesPath,
} from "./output_cache_paths.js";
import {
  collectUnreferencedOutputCacheEntries,
  replaceFile,
} from "./output_cache_replace.js";
import type { OutputCacheState } from "./output_cache_types.js";
import { measure, measureSync } from "./runtime_metrics.js";

export async function saveOutputCache(
  path: string,
  state: OutputCacheState,
  outputDirectory: string,
  timingsMs?: Record<string, number>,
): Promise<string> {
  const directory = dirname(path);
  await mkdir(directory, { recursive: true });
  if (!(await isSafeOutputCacheDirectory(directory))) {
    throw new Error(`Unsafe SSG output cache directory: ${directory}`);
  }
  if (!(await isSafeCacheFileTarget(path))) {
    throw new Error(`Unsafe SSG output cache file: ${path}`);
  }
  const entriesPath = outputCacheEntriesPath(path);
  const temporaryPath = `${path}.${randomUUID()}.tmp`;

  try {
    const outputs = await measure(timingsMs, "outputCacheEntriesWrite", () =>
      saveOutputCacheEntries(
        entriesPath,
        outputDirectory,
        state.outputs,
        state.finalOutputInventory,
        timingsMs,
      ),
    );
    const serialized = measureSync(
      timingsMs,
      "outputCacheSerialize",
      () => `${JSON.stringify({ ...state, outputs })}\n`,
    );
    await measure(timingsMs, "outputCacheWrite", () =>
      writeFile(temporaryPath, serialized, "utf8"),
    );
    await measure(timingsMs, "outputCacheRename", () =>
      replaceFile(temporaryPath, path),
    );
    const checksum = createHash("sha256").update(serialized).digest("hex");
    if (state.finalOutputInventory && state.configFile) {
      await saveFastPathCache(
        fastPathCachePath(path),
        await createFastPathCacheState(state, checksum, outputDirectory),
        timingsMs,
      );
    }
    await collectUnreferencedOutputCacheEntries(
      outputCacheEntriesPath(path),
      outputs,
      timingsMs,
    );
    return checksum;
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}
