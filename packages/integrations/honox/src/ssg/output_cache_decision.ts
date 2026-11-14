import { join } from "node:path";
import { performance } from "node:perf_hooks";
import {
  computeAppFingerprint,
  fingerprintDirectory,
  fingerprintOutputDirectory,
  inventoriesEqual,
} from "./inventory.js";
import {
  collectOutputFileStats,
  fastPathCachePath,
  loadFastPathCache,
  matchingOutputChecksums,
  outputStatsEqual,
  saveFastPathCache,
} from "./output_cache_fastpath.js";
import { checksumFile } from "./output_cache_replace.js";
import type {
  NoChangeFastPathOutputMetrics,
  NoChangeFastPathResult,
  OutputCacheDecision,
  OutputCacheRejectionReason,
} from "./types.js";

export function decideOutputCacheRejection(
  decision: OutputCacheDecision,
): OutputCacheRejectionReason | undefined {
  if (!decision.changeSetPresent) return "change-set-unavailable";
  if (decision.changeSetRequiresFullRegeneration)
    return "full-regeneration-required";
  if (!decision.outputCacheLoaded) return "output-cache-missing-or-invalid";
  if (!decision.appFingerprintMatch) return "app-fingerprint-changed";
  if (!decision.clientManifestFingerprintMatch)
    return "client-manifest-fingerprint-changed";
  if (decision.uncoveredUnchangedCount > 0)
    return "unchanged-output-not-cached";
  return undefined;
}

export function createNoChangeFastPathOutputMetrics(): NoChangeFastPathOutputMetrics {
  return {
    outputInventoryValidationDurationMs: 0,
    outputHashValidationDurationMs: 0,
    outputFilesHashed: 0,
    outputBytesHashed: 0,
  };
}

export async function verifyNoChangeFastPath(input: {
  readonly root: string;
  readonly outputDirectory: string;
  readonly expectedOutputPaths: readonly string[];
  readonly metrics?: NoChangeFastPathOutputMetrics;
}): Promise<NoChangeFastPathResult> {
  const outputCachePath = join(
    input.root,
    ".riebeckite",
    "ssg-output-cache.json",
  );
  const cache = await loadFastPathCache(fastPathCachePath(outputCachePath));
  if (!cache)
    return { used: false, blockReason: "output-cache-missing-or-invalid" };
  if (cache.outputCacheChecksum !== (await checksumFile(outputCachePath))) {
    return { used: false, blockReason: "output-cache-missing-or-invalid" };
  }
  if (
    cache.appFingerprint !==
    (await computeAppFingerprint(input.root, cache.configFile))
  ) {
    return { used: false, blockReason: "app-fingerprint-changed" };
  }
  if (
    cache.publicDirectory &&
    cache.publicFingerprint !==
      (await fingerprintDirectory(cache.publicDirectory))
  ) {
    return { used: false, blockReason: "static-assets-changed" };
  }
  if (
    input.expectedOutputPaths.some(
      (output) =>
        !cache.outputPaths.includes(output) ||
        !cache.finalOutputInventory[output],
    )
  ) {
    return { used: false, blockReason: "output-cache-incomplete" };
  }
  const knownChecksums = await matchingOutputChecksums(
    input.outputDirectory,
    cache.finalOutputInventory,
    cache.finalOutputStats,
  );
  const inventoryStartedAt = performance.now();
  const currentInventory = await fingerprintOutputDirectory(
    input.outputDirectory,
    "",
    input.metrics,
    knownChecksums,
  );
  if (input.metrics)
    input.metrics.outputInventoryValidationDurationMs +=
      performance.now() - inventoryStartedAt;
  if (!inventoriesEqual(cache.finalOutputInventory, currentInventory)) {
    return { used: false, blockReason: "output-inventory-mismatch" };
  }
  const currentStats = await collectOutputFileStats(
    input.outputDirectory,
    cache.finalOutputInventory,
  );
  if (!outputStatsEqual(cache.finalOutputStats, currentStats)) {
    await saveFastPathCache(fastPathCachePath(outputCachePath), {
      ...cache,
      finalOutputStats: currentStats,
    }).catch(() => undefined);
  }
  return { used: true };
}
