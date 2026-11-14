import { resolve } from "node:path";
import { buildOutputPlan, compareOutputPlan } from "@riebeckite/core";
import {
  CLOUDFLARE_WORKER_ASSET_LIMIT,
  findOversizedAssets,
  formatBytes,
} from "./ssg/build_output.js";
import {
  fingerprintDirectory,
  fingerprintOutputDirectory,
  fingerprintOutputInventory,
} from "./ssg/inventory.js";
import { saveOutputCache } from "./ssg/output_cache.js";
import {
  measure,
  measureSync,
  writeSsgOutputMetrics,
} from "./ssg/runtime_metrics.js";
import {
  assertRequiredOutputsWereGenerated,
  writePublicationMarker,
} from "./ssg_plugin_helpers.js";
import type { SsgPluginLogger, SsgPluginState } from "./ssg_plugin_state.js";

export async function closeSsgBundle(
  plugin: SsgPluginLogger,
  state: SsgPluginState,
): Promise<void> {
  if (!state.resolvedConfig) return;
  if (state.resolvedConfig.mode === "client") return;
  const outputDirectory = state.publicationOutputDirectory;
  if (!outputDirectory) {
    throw new Error(
      "Riebeckite SSG could not resolve the publication output directory.",
    );
  }

  const outDir = resolve(
    state.resolvedConfig.root,
    state.resolvedConfig.build.outDir,
  );
  const oversizedAssets = await findOversizedAssets(outDir);
  for (const asset of oversizedAssets) {
    plugin.warn(
      `Generated asset ${asset.path} is ${formatBytes(asset.size)}, exceeding Cloudflare Workers' ${formatBytes(CLOUDFLARE_WORKER_ASSET_LIMIT)} asset limit.`,
    );
  }
  const outputCache = state.pendingOutputCache;
  if (!outputCache) return;
  let published = false;
  try {
    if (!state.artifactWriter) {
      throw new Error("Riebeckite SSG artifact writer was not initialized.");
    }
    outputCache.state.finalOutputInventory = await measure(
      outputCache.timingsMs,
      "outputInventory",
      () =>
        fingerprintOutputDirectory(
          outputCache.outDir,
          "",
          undefined,
          state.outputChecksums,
        ),
    );
    const finalOutputInventory = outputCache.state.finalOutputInventory;
    const artifactFingerprint =
      fingerprintOutputInventory(finalOutputInventory);
    if (outputCache.provenance && outputCache.content) {
      await outputCache.content.attachFinalOutputArtifacts(
        outputCache.provenance.buildId,
        finalOutputInventory,
        outputCache.reusablePaths,
      );
    }
    const outputPlanRssBefore = process.memoryUsage().rss;
    const outputPlan = measureSync(outputCache.timingsMs, "outputPlan", () =>
      buildOutputPlan({
        ...outputCache.outputPlanInput,
      }),
    );
    const outputPlanComparison = measureSync(
      outputCache.timingsMs,
      "outputPlanComparison",
      () => compareOutputPlan(outputPlan, Object.keys(finalOutputInventory)),
    );
    outputCache.metrics.plannedOutputCount = outputPlan.entries.length;
    outputCache.metrics.actualOutputCount =
      Object.keys(finalOutputInventory).length;
    outputCache.metrics.matchedOutputCount =
      outputPlanComparison.matched.length;
    outputCache.metrics.missingInPlanCount =
      outputPlanComparison.missingInPlan.length;
    outputCache.metrics.missingInDistCount =
      outputPlanComparison.missingInDist.length;
    outputCache.metrics.unknownOutputCount =
      outputPlanComparison.unknown.length;
    outputCache.metrics.ownerConflictCount =
      outputPlanComparison.ownerConflicts.length;
    outputCache.metrics.publicationViolationCount =
      outputPlanComparison.publicationViolations.length;
    outputCache.metrics.plannedGenerateOutputCount = outputPlan.entries.filter(
      (entry) => entry.action === "generate",
    ).length;
    outputCache.metrics.plannedReuseOutputCount = outputPlan.entries.filter(
      (entry) => entry.action === "reuse",
    ).length;
    outputCache.metrics.plannedRemoveOutputCount = outputPlan.entries.filter(
      (entry) => entry.action === "remove",
    ).length;
    outputCache.metrics.plannedUnknownOutputCount = outputPlan.entries.filter(
      (entry) => entry.action === "unknown",
    ).length;
    outputCache.metrics.outputPlanMemoryDeltaBytes = Math.max(
      0,
      process.memoryUsage().rss - outputPlanRssBefore,
    );
    assertRequiredOutputsWereGenerated(outputPlanComparison);
    const publicDir = outputCache.publicDir;
    outputCache.state.publicDirectory = publicDir
      ? resolve(publicDir)
      : undefined;
    outputCache.state.publicFingerprint = publicDir
      ? await measure(outputCache.timingsMs, "publicFingerprint", () =>
          fingerprintDirectory(resolve(publicDir)),
        )
      : undefined;
    try {
      await saveOutputCache(
        outputCache.path,
        outputCache.state,
        outputCache.outDir,
        outputCache.timingsMs,
      );
    } catch (error) {
      plugin.warn(
        `SSG output cache could not be saved; the next build regenerates every output. ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    await state.artifactWriter.publish();
    published = true;
    await writePublicationMarker({
      root: state.resolvedConfig.root,
      outputDirectory,
      publicationFingerprint: outputCache.publicationFingerprint,
      artifactFingerprint,
      warn: (message) => plugin.warn(message),
    });
  } finally {
    if (!published) await state.artifactWriter?.discard();
    await writeSsgOutputMetrics(outputCache.metrics);
    state.pendingOutputCache = undefined;
    state.artifactWriter = undefined;
  }
}
