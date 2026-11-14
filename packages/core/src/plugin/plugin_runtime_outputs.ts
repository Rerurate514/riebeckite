import { getContentSourceEntry } from "../content/content_source.js";
import type {
  ContentAsset,
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest.js";
import type {
  AssetTransformOutput,
  RiebeckitePlugin,
} from "../types/plugin.js";
import {
  createPluginCache,
  createUnavailablePluginCache,
  type PluginCache,
  resolvePluginCacheDirectory,
} from "./plugin_cache.js";
import type {
  PluginContextBase,
  PluginContextWithCache,
} from "./plugin_runtime_context.js";
import type { PluginRuntimeContext } from "./plugin_runtime_state_types.js";

export async function runAssetTransformsImpl(
  m: PluginRuntimeContext,
  manifest: ContentManifest,
): Promise<void> {
  const source = m.pipelineOptions.contentSource;
  if (!source) return;

  const referencedBy = new Map<string, ContentManifestEntry[]>();
  for (const entry of manifest.publicEntries) {
    for (const asset of entry.assets) {
      const entries = referencedBy.get(asset.path) ?? [];
      entries.push(entry);
      referencedBy.set(asset.path, entries);
    }
  }
  if (referencedBy.size === 0) return;

  const sourceEntries = new Map(
    (await source.scan()).map((entry) => [entry.path, entry]),
  );
  const assets = [...referencedBy.keys()]
    .sort()
    .map((path) => ({ path, size: sourceEntries.get(path)?.metadata?.size }));
  const readAsset = async (path: string): Promise<Uint8Array | null> => {
    if (!referencedBy.has(path)) {
      throw new Error(
        `Asset transform cannot read non-public asset: "${path}".`,
      );
    }
    const entry =
      sourceEntries.get(path) ?? (await getContentSourceEntry(source, path));
    if (!entry) return null;
    const content = await source.read(entry);
    return typeof content === "string" ? null : content;
  };

  for (const plugin of m.plugins()) {
    if (!plugin.transformAssets) continue;
    const outputs = await m.observeHook(
      plugin,
      "transformAssets",
      async () =>
        plugin.transformAssets?.({
          assets,
          readAsset,
          cache: m.cacheFor(plugin),
          logger: m.observability().logger.child({ plugin: plugin.name }),
          tracer: m.observability().tracer,
        }) ?? [],
    );
    m.registerAssetTransforms(plugin, outputs, referencedBy);
  }
}

export function registerAssetTransformsImpl(
  m: PluginRuntimeContext,
  plugin: RiebeckitePlugin,
  outputs: readonly AssetTransformOutput[],
  referencedBy: ReadonlyMap<string, readonly ContentManifestEntry[]>,
): void {
  const sink = m.generatedOutputSinkFor(plugin);
  for (const output of outputs) {
    const entries = referencedBy.get(output.sourcePath);
    if (!entries) {
      throw new Error(
        `Asset transform from "${plugin.name}" emitted output for non-public asset: "${output.sourcePath}".`,
      );
    }
    sink.emitAsset({
      path: output.path,
      content: output.content,
      dependencies: [
        { type: "file", path: output.sourcePath },
        ...(output.dependencies ?? []),
      ],
    });
    const asset: ContentAsset = {
      path: output.path,
      sourcePath: output.sourcePath,
      mimeType: output.mimeType,
      width: output.width,
      height: output.height,
      size: output.content.byteLength,
    };
    for (const entry of entries) entry.assets.push(asset);
  }
}

export function derivedCacheImpl(m: PluginRuntimeContext): PluginCache {
  if (!m.isBuildTime) return createUnavailablePluginCache();
  return createPluginCache({
    pluginName: "riebeckite-derived-data",
    cacheVersion: "3",
    cacheDirectory: resolvePluginCacheDirectory(m.pipelineOptions.config),
    logger: m.observability().logger.child({
      plugin: "riebeckite-derived-data",
    }),
    tracer: m.observability().tracer,
  });
}

export function cacheForImpl(
  m: PluginRuntimeContext,
  plugin: RiebeckitePlugin,
): PluginCache {
  const cached = m.pluginCaches.get(plugin.name);
  if (cached) return cached;

  const cache = m.isBuildTime
    ? createPluginCache({
        pluginName: plugin.name,
        cacheVersion: plugin.cacheVersion,
        cacheDirectory: resolvePluginCacheDirectory(m.pipelineOptions.config),
        logger: m.observability().logger.child({ plugin: plugin.name }),
        tracer: m.observability().tracer,
      })
    : createUnavailablePluginCache();
  if (!m.isBuildTime) {
    m.observability().tracer.event("cache.bypass", {
      plugin: plugin.name,
    });
  }
  m.pluginCaches.set(plugin.name, cache);
  return cache;
}

export function createContextImpl(
  m: PluginRuntimeContext,
  contentIndex: Map<string, string>,
): PluginContextBase {
  m.contentIndex = contentIndex;
  return {
    config: m.pipelineOptions.config,
    isDevelopment: m.pipelineOptions.isDevelopment,
    buildTime: m.pipelineOptions.publishingBuildTime
      ? new Date(m.pipelineOptions.publishingBuildTime)
      : undefined,
    contentIndex,
    contentSource: m.pipelineOptions.contentSource,
    diagnostics: m.diagnostics,
    externalDependencies: m.externalDependencies,
  };
}

export function createPluginContextImpl<TContext extends PluginContextBase>(
  m: PluginRuntimeContext,
  plugin: RiebeckitePlugin,
  context: TContext,
): PluginContextWithCache<TContext> {
  const observability = m.observability();
  return {
    ...context,
    cache: m.cacheFor(plugin),
    derived: m.derivedViews,
    output: m.generatedOutputSinkFor(plugin),
    logger: observability.logger.child({ plugin: plugin.name }),
    tracer: observability.tracer,
  };
}
