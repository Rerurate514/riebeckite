import { relative } from "node:path";
import { fingerprintOutputContent } from "./ssg/inventory.js";
import { resolveOutputCacheEntryPath } from "./ssg/output_cache.js";
import { runSsg } from "./ssg/runner.js";
import { measure } from "./ssg/runtime_metrics.js";
import type { SsgGeneration } from "./ssg_plugin_generate_prepare.js";
import {
  emitGeneratedOutputs,
  outputCacheEntryFor,
} from "./ssg_plugin_helpers.js";
import type {
  RiebeckiteSsgOptions,
  SsgPluginLogger,
} from "./ssg_plugin_state.js";

export async function runSsgGeneration(
  _plugin: SsgPluginLogger,
  ctx: SsgGeneration,
  options: RiebeckiteSsgOptions,
): Promise<void> {
  const outputChangeSet = ctx.outputChangeSet;
  const previousOutputCache = ctx.previousOutputCache;
  const result = await measure(ctx.timingsMs, "toSSG", () =>
    runSsg({
      app: ctx.app,
      outDir: ctx.outDir,
      incremental: ctx.canUseIncremental,
      plugins: options.plugins,
      extensionMap: options.extensionMap,
      ...(options.concurrency === undefined
        ? {}
        : { concurrency: options.concurrency }),
      write: async (filePath, data) => {
        const fileName = relative(ctx.outDir, filePath).replaceAll("\\", "/");
        if (!ctx.inventoryPaths.has(fileName)) {
          ctx.honoStaticRoutePaths.add(fileName);
        }
        if (ctx.siteOwnedOutputPaths.has(fileName)) {
          ctx.shadowedOutputs.add(fileName);
          return;
        }
        if (ctx.canUseIncremental && ctx.reusablePaths.has(fileName)) {
          return;
        }
        if (fileName.endsWith(".html") && typeof data === "string") {
          ctx.metrics.renderedOutputCount += 1;
          ctx.metrics.renderedRouteCount += 1;
          ctx.metrics.htmlOutputCount += 1;
          ctx.generatedHtml.push({ path: fileName, html: data });
        } else {
          ctx.metrics.assetOutputCount += 1;
        }
        if (!ctx.artifactWriter) {
          throw new Error(
            "Riebeckite SSG artifact writer was not initialized.",
          );
        }
        const writer = ctx.artifactWriter;
        await measure(ctx.timingsMs, "outputWrite", () =>
          writer.write(fileName, data),
        );
        const checksum = fingerprintOutputContent(data);
        ctx.outputChecksums.set(fileName, checksum);
        ctx.metrics.emittedOutputCount += 1;
        ctx.nextOutputCache.outputs[fileName] = outputCacheEntryFor(
          previousOutputCache,
          fileName,
          checksum,
        );
      },
    }),
  );
  ctx.metrics.enumeratedRouteCount = result.files.length;
  if (!result.success) throw result.error;
  ctx.metrics.processedContentCount =
    ctx.module.content?.getProcessedContentCount() ?? 0;
  ctx.metrics.reusedContentCount =
    ctx.module.content?.getReusedContentCount() ?? 0;
  const manifestHookMetrics = ctx.module.content?.getManifestHookMetrics();
  ctx.metrics.manifestHooksExecuted =
    manifestHookMetrics?.manifestHooksExecuted ?? 0;
  ctx.metrics.manifestHooksReused =
    manifestHookMetrics?.manifestHooksReused ?? 0;
  ctx.metrics.manifestHookCacheHit =
    manifestHookMetrics?.manifestHookCacheHit ?? 0;
  ctx.metrics.manifestHookCacheMiss =
    manifestHookMetrics?.manifestHookCacheMiss ?? 0;
  ctx.metrics.manifestHookDurationMs =
    manifestHookMetrics?.manifestHookDurationMs ?? 0;
  ctx.metrics.manifestHookPlugins = manifestHookMetrics?.byPlugin ?? {};

  const emittedGeneratedOutputCount = await measure(
    ctx.timingsMs,
    "generatedOutputs",
    () =>
      emitGeneratedOutputs(
        ctx.module,
        async (asset) => {
          if (!ctx.artifactWriter) {
            throw new Error(
              "Riebeckite SSG artifact writer was not initialized.",
            );
          }
          const writer = ctx.artifactWriter;
          await measure(ctx.timingsMs, "outputWrite", () =>
            writer.write(asset.fileName, asset.source),
          );
          const checksum = fingerprintOutputContent(asset.source);
          ctx.outputChecksums.set(asset.fileName, checksum);
          ctx.metrics.emittedOutputCount += 1;
          ctx.nextOutputCache.outputs[asset.fileName] = outputCacheEntryFor(
            previousOutputCache,
            asset.fileName,
            checksum,
          );
        },
        ctx.canUseIncremental
          ? new Set(
              (outputChangeSet?.affected ?? [])
                .filter((output) => output.kind === "generated")
                .map((output) => output.path),
            )
          : undefined,
        ctx.siteOwnedOutputPaths,
        (path) => ctx.shadowedOutputs.add(path),
      ),
  );
  if (!outputChangeSet)
    ctx.metrics.candidateOutputCount =
      result.files.length + emittedGeneratedOutputCount;
  if (ctx.canUseIncremental && outputChangeSet && previousOutputCache) {
    await measure(ctx.timingsMs, "unchangedOutputReuse", async () => {
      for (const output of outputChangeSet.unchanged) {
        const path = output.path;
        if (ctx.siteOwnedOutputPaths.has(path)) {
          ctx.shadowedOutputs.add(path);
          continue;
        }
        const cached = previousOutputCache.outputs[path];
        if (!cached) continue;
        if (!ctx.artifactWriter) {
          throw new Error(
            "Riebeckite SSG artifact writer was not initialized.",
          );
        }
        const writer = ctx.artifactWriter;
        await measure(ctx.timingsMs, "outputWrite", () =>
          writer.copyFileFrom(
            resolveOutputCacheEntryPath(ctx.outputCachePath, cached),
            path,
          ),
        );
        ctx.outputChecksums.set(path, cached.checksum);
        ctx.metrics.emittedOutputCount += 1;
        ctx.metrics.reusedOutputCount += 1;
        ctx.nextOutputCache.outputs[path] = cached;
      }
    });
  }
  if (outputChangeSet) {
    for (const output of outputChangeSet.removed) {
      if (ctx.siteOwnedOutputPaths.has(output.path)) continue;
      if (!ctx.artifactWriter) {
        throw new Error("Riebeckite SSG artifact writer was not initialized.");
      }
      await ctx.artifactWriter.remove(output.path);
      ctx.metrics.deletedOutputCount += 1;
    }
  }
}
