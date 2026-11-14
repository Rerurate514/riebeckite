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
import type { PluginRuntimeContext } from "./plugin_runtime_state_types.js";

export class PluginRuntimeMethodsC extends PluginRuntimeMethodsB {
  runAssetTransforms = async (manifest: ContentManifest): Promise<void> =>
    await runAssetTransformsImpl(
      this as unknown as PluginRuntimeContext,
      manifest,
    );

  registerAssetTransforms = (
    plugin: RiebeckitePlugin,
    outputs: readonly AssetTransformOutput[],
    referencedBy: ReadonlyMap<string, readonly ContentManifestEntry[]>,
  ): void =>
    registerAssetTransformsImpl(
      this as unknown as PluginRuntimeContext,
      plugin,
      outputs,
      referencedBy,
    );

  derivedCache = (): PluginCache =>
    derivedCacheImpl(this as unknown as PluginRuntimeContext);

  cacheFor = (plugin: RiebeckitePlugin): PluginCache =>
    cacheForImpl(this as unknown as PluginRuntimeContext, plugin);

  createContext = (contentIndex: Map<string, string>): PluginContextBase =>
    createContextImpl(this as unknown as PluginRuntimeContext, contentIndex);

  createPluginContext = <TContext extends PluginContextBase>(
    plugin: RiebeckitePlugin,
    context: TContext,
  ): PluginContextWithCache<TContext> =>
    createPluginContextImpl(
      this as unknown as PluginRuntimeContext,
      plugin,
      context,
    );
}
