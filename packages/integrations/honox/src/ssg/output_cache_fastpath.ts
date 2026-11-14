import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveWithinDirectory } from "./file_system.js";
import {
  isRegularFile,
  isSafeCacheFileTarget,
  isSafeOutputCacheDirectory,
} from "./output_cache_paths.js";
import { replaceFile } from "./output_cache_replace.js";
import type {
  FastPathCacheState,
  OutputCacheState,
  OutputFileStats,
} from "./output_cache_types.js";
import { isFastPathCacheState } from "./output_cache_validate.js";
import { measure } from "./runtime_metrics.js";

export function fastPathCachePath(outputCachePath: string): string {
  return outputCachePath.replace(/\.json$/, ".fast-path.json");
}

export async function createFastPathCacheState(
  state: OutputCacheState,
  outputCacheChecksum: string,
  outputDirectory: string,
): Promise<FastPathCacheState> {
  if (!state.finalOutputInventory || !state.configFile) {
    throw new Error("SSG output cache is missing fast-path validation data.");
  }
  return {
    version: 1,
    outputCacheChecksum,
    appFingerprint: state.appFingerprint,
    finalOutputInventory: state.finalOutputInventory,
    finalOutputStats: await collectOutputFileStats(
      outputDirectory,
      state.finalOutputInventory,
    ),
    publicDirectory: state.publicDirectory,
    publicFingerprint: state.publicFingerprint,
    configFile: state.configFile,
    outputPaths: Object.keys(state.outputs).sort(),
  };
}

export async function matchingOutputChecksums(
  outputDirectory: string,
  inventory: Readonly<Record<string, string>>,
  stats: Readonly<Record<string, OutputFileStats>> | undefined,
): Promise<ReadonlyMap<string, string>> {
  const checksums = new Map<string, string>();
  if (!stats) return checksums;
  for (const [outputPath, checksum] of Object.entries(inventory)) {
    const expected = stats[outputPath];
    if (!expected) continue;
    const info = await lstat(
      resolveWithinDirectory(
        outputDirectory,
        outputPath,
        "SSG fast-path output path",
      ),
    ).catch(() => undefined);
    if (
      info?.isFile() &&
      !info.isSymbolicLink() &&
      outputFileStatMatches(info, expected)
    ) {
      checksums.set(outputPath, checksum);
    }
  }
  return checksums;
}

export async function collectOutputFileStats(
  outputDirectory: string,
  inventory: Readonly<Record<string, string>>,
): Promise<Record<string, OutputFileStats>> {
  const stats: Record<string, OutputFileStats> = {};
  for (const outputPath of Object.keys(inventory)) {
    const info = await lstat(
      resolveWithinDirectory(
        outputDirectory,
        outputPath,
        "SSG fast-path output path",
      ),
    ).catch(() => undefined);
    if (info?.isFile() && !info.isSymbolicLink()) {
      stats[outputPath] = {
        size: info.size,
        modifiedAtMs: info.mtimeMs,
      };
    }
  }
  return stats;
}

export function outputFileStatMatches(
  info: { readonly size: number; readonly mtimeMs: number },
  expected: OutputFileStats,
): boolean {
  return info.size === expected.size && info.mtimeMs === expected.modifiedAtMs;
}

export function outputStatsEqual(
  left: Readonly<Record<string, OutputFileStats>> | undefined,
  right: Readonly<Record<string, OutputFileStats>>,
): boolean {
  if (!left) return false;
  const paths = Object.keys(left);
  if (paths.length !== Object.keys(right).length) return false;
  return paths.every(
    (path) =>
      right[path] !== undefined &&
      left[path]?.size === right[path].size &&
      left[path]?.modifiedAtMs === right[path].modifiedAtMs,
  );
}

export async function saveFastPathCache(
  path: string,
  state: FastPathCacheState,
  timingsMs?: Record<string, number>,
): Promise<void> {
  const directory = dirname(path);
  await mkdir(directory, { recursive: true });
  if (!(await isSafeOutputCacheDirectory(directory))) {
    throw new Error(`Unsafe SSG fast-path cache directory: ${directory}`);
  }
  if (!(await isSafeCacheFileTarget(path))) {
    throw new Error(`Unsafe SSG fast-path cache file: ${path}`);
  }
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  try {
    await measure(timingsMs, "sidecarWrite", () =>
      writeFile(temporaryPath, `${JSON.stringify(state)}\n`, "utf8"),
    );
    await measure(timingsMs, "sidecarRename", () =>
      replaceFile(temporaryPath, path),
    );
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function loadFastPathCache(
  path: string,
): Promise<FastPathCacheState | undefined> {
  try {
    if (!(await isSafeOutputCacheDirectory(dirname(path)))) return undefined;
    if (!(await isRegularFile(path))) return undefined;
    const candidate: unknown = JSON.parse(await readFile(path, "utf8"));
    return isFastPathCacheState(candidate) ? candidate : undefined;
  } catch {
    return undefined;
  }
}
