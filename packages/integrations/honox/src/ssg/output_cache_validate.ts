import {
  isSafeLogicalOutputPath,
  outputCacheEntryName,
} from "./output_cache_paths.js";
import type {
  FastPathCacheState,
  OutputCacheEntry,
  OutputCacheState,
  OutputFileStats,
} from "./output_cache_types.js";

export function isOutputCacheState(value: unknown): value is OutputCacheState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as {
    version?: unknown;
    appFingerprint?: unknown;
    bundleFingerprint?: unknown;
    clientManifestFingerprint?: unknown;
    outputs?: unknown;
    finalOutputInventory?: unknown;
    publicDirectory?: unknown;
    publicFingerprint?: unknown;
    configFile?: unknown;
  };
  return (
    candidate.version === 4 &&
    (candidate.appFingerprint === undefined ||
      typeof candidate.appFingerprint === "string") &&
    (candidate.bundleFingerprint === undefined ||
      typeof candidate.bundleFingerprint === "string") &&
    (candidate.clientManifestFingerprint === undefined ||
      typeof candidate.clientManifestFingerprint === "string") &&
    isOutputCacheEntries(candidate.outputs) &&
    (candidate.finalOutputInventory === undefined ||
      isOutputInventory(candidate.finalOutputInventory)) &&
    (candidate.publicDirectory === undefined ||
      typeof candidate.publicDirectory === "string") &&
    (candidate.publicFingerprint === undefined ||
      typeof candidate.publicFingerprint === "string") &&
    (candidate.configFile === undefined ||
      typeof candidate.configFile === "string")
  );
}

export function isOutputInventory(
  value: unknown,
): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.entries(value).every(
      ([outputPath, checksum]) =>
        isSafeLogicalOutputPath(outputPath) && isChecksum(checksum),
    )
  );
}

export function isOutputFileStats(
  value: unknown,
): value is Record<string, OutputFileStats> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.entries(value).every(
      ([outputPath, stats]) =>
        isSafeLogicalOutputPath(outputPath) &&
        typeof stats === "object" &&
        stats !== null &&
        isOptionalNonNegativeNumber((stats as OutputFileStats).size) &&
        (stats as OutputFileStats).size !== undefined &&
        isOptionalNonNegativeNumber((stats as OutputFileStats).modifiedAtMs) &&
        (stats as OutputFileStats).modifiedAtMs !== undefined,
    )
  );
}

export function isOutputCacheEntries(
  value: unknown,
): value is OutputCacheState["outputs"] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.entries(value).every(
    ([outputPath, entry]) =>
      isSafeLogicalOutputPath(outputPath) &&
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as OutputCacheEntry).cachePath === "string" &&
      (entry as OutputCacheEntry).cachePath ===
        outputCacheEntryName(outputPath) &&
      isChecksum((entry as OutputCacheEntry).checksum) &&
      isOptionalNonNegativeNumber((entry as OutputCacheEntry).size) &&
      isOptionalNonNegativeNumber((entry as OutputCacheEntry).modifiedAtMs),
  );
}

export function isOptionalNonNegativeNumber(
  value: unknown,
): value is number | undefined {
  return (
    value === undefined ||
    (typeof value === "number" && Number.isFinite(value) && value >= 0)
  );
}

export function isFastPathCacheState(
  value: unknown,
): value is FastPathCacheState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<FastPathCacheState>;
  return (
    candidate.version === 1 &&
    typeof candidate.outputCacheChecksum === "string" &&
    (candidate.appFingerprint === undefined ||
      typeof candidate.appFingerprint === "string") &&
    isOutputInventory(candidate.finalOutputInventory) &&
    (candidate.finalOutputStats === undefined ||
      isOutputFileStats(candidate.finalOutputStats)) &&
    (candidate.publicDirectory === undefined ||
      typeof candidate.publicDirectory === "string") &&
    (candidate.publicFingerprint === undefined ||
      typeof candidate.publicFingerprint === "string") &&
    typeof candidate.configFile === "string" &&
    Array.isArray(candidate.outputPaths) &&
    candidate.outputPaths.every(isSafeLogicalOutputPath) &&
    candidate.outputPaths.every(
      (path, index, paths) => index === 0 || paths[index - 1] < path,
    )
  );
}

export function isChecksum(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}
