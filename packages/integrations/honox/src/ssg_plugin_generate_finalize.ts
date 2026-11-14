import {
  publicationFingerprint as fingerprintPublication,
  publicationEntriesFromManifest,
  publicationOutputsFromManifest,
  publicationRedirectsFromManifest,
} from "@riebeckite/core";
import {
  inspectGeneratedHtmlPages,
  logGeneratedHtmlAssetDiagnostics,
} from "./ssg/diagnostics.js";
import type { SsgGeneration } from "./ssg_plugin_generate_prepare.js";
import type { SsgPluginLogger, SsgPluginState } from "./ssg_plugin_state.js";

export async function finalizeSsgGeneration(
  plugin: SsgPluginLogger,
  ctx: SsgGeneration,
  state: SsgPluginState,
): Promise<void> {
  ctx.metrics.shadowedOutputCount = ctx.shadowedOutputs.size;
  if (ctx.shadowedOutputs.size > 0) {
    plugin.warn(
      `Site public assets take precedence over generated outputs: ${[
        ...ctx.shadowedOutputs,
      ]
        .sort()
        .join(", ")}`,
    );
  }
  ctx.metrics.cacheEntriesSerialized = Object.keys(
    ctx.nextOutputCache.outputs,
  ).length;
  const manifest = await ctx.module.content?.getManifest();
  const publicationFingerprint = manifest
    ? fingerprintPublication(
        publicationEntriesFromManifest(manifest),
        publicationRedirectsFromManifest(manifest),
        publicationOutputsFromManifest(manifest),
      )
    : undefined;
  state.pendingOutputCache = {
    path: ctx.outputCachePath,
    state: ctx.nextOutputCache,
    metrics: ctx.metrics,
    timingsMs: ctx.timingsMs,
    outDir: ctx.outDir,
    publicDir: ctx.config.publicDir,
    configFile: ctx.config.configFile,
    ...(publicationFingerprint === undefined ? {} : { publicationFingerprint }),
    outputPlanInput: {
      inventory: ctx.inventory,
      affectedPaths: new Set(
        (ctx.outputChangeSet?.affected ?? []).map((output) => output.path),
      ),
      removed: ctx.outputChangeSet?.removed ?? [],
      cacheAvailable: ctx.canUseIncremental,
      honoStaticRoutePaths: ctx.honoStaticRoutePaths,
      viteClientAssetPaths: new Set(ctx.viteClientAssetPaths),
      sitePublicAssetPaths: ctx.siteOwnedOutputPaths,
    },
    provenance: ctx.module.content?.getProvenance(),
    content: ctx.module.content,
    reusablePaths: new Set(
      [...ctx.reusablePaths].filter(
        (path) => !ctx.siteOwnedOutputPaths.has(path),
      ),
    ),
  };
  plugin.info(
    `SSG outputs: ${ctx.metrics.renderedOutputCount} rendered · ${ctx.metrics.reusedOutputCount} reused · ${ctx.metrics.deletedOutputCount} removed`,
  );
  const generatedHtmlDiagnostics = inspectGeneratedHtmlPages(
    ctx.module,
    ctx.generatedHtml,
    {
      warn: (message) => plugin.warn(message),
      info: (message) => plugin.info(message),
    },
  );
  ctx.module.content?.recordFinalHtmlDiagnostics?.(generatedHtmlDiagnostics);
  logGeneratedHtmlAssetDiagnostics(plugin, ctx.generatedHtml);
}
