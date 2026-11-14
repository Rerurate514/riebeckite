import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest.js";
import type {
  AssetTransformOutput,
  RiebeckitePlugin,
} from "../types/plugin.js";
import type { PluginCache } from "./plugin_cache.js";
import type {
  PluginContextBase,
  PluginContextWithCache,
} from "./plugin_runtime_context.js";
import { PluginRuntimeMethodsB } from "./plugin_runtime_methods_b.js";
import {
  cacheForImpl,
  createContextImpl,
  createPluginContextImpl,
  derivedCacheImpl,
  registerAssetTransformsImpl,
  runAssetTransformsImpl,
} from "./plugin_runtime_outputs.js";
import { asPluginRuntimeContext } from "./plugin_runtime_state_types.js";

export class PluginRuntimeMethodsC extends PluginRuntimeMethodsB {
  runAssetTransforms = async (manifest: ContentManifest): Promise<void> =>
    await runAssetTransformsImpl(asPluginRuntimeContext(this), manifest);

  registerAssetTransforms = (
    plugin: RiebeckitePlugin,
    outputs: readonly AssetTransformOutput[],
    referencedBy: ReadonlyMap<string, readonly ContentManifestEntry[]>,
  ): void =>
    registerAssetTransformsImpl(
      asPluginRuntimeContext(this),
      plugin,
      outputs,
      referencedBy,
    );

  derivedCache = (): PluginCache =>
    derivedCacheImpl(asPluginRuntimeContext(this));

  cacheFor = (plugin: RiebeckitePlugin): PluginCache =>
    cacheForImpl(asPluginRuntimeContext(this), plugin);

  createContext = (contentIndex: Map<string, string>): PluginContextBase =>
    createContextImpl(asPluginRuntimeContext(this), contentIndex);

  createPluginContext = <TContext extends PluginContextBase>(
    plugin: RiebeckitePlugin,
    context: TContext,
  ): PluginContextWithCache<TContext> =>
    createPluginContextImpl(asPluginRuntimeContext(this), plugin, context);
}
