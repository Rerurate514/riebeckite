import type { ManifestHookCacheEntry } from "../content/content_build_state.js";
import type { DerivedViewRegistry } from "../derived/derived_view.js";
import type { Diagnostic } from "../types/diagnostic.js";
import type {
  GeneratedOutput,
  GeneratedOutputContent,
} from "../types/generated_output.js";
import type {
  ContentOutputDependencyResolver,
  ResolvedPluginMetadata,
} from "../types/plugin.js";
import type { PluginClientEntry } from "../types/plugin_asset.js";
import type { InspectorTabSnapshot } from "../types/plugin_inspector.js";
import type { ManifestHookMetrics } from "./manifest_hooks.js";
import type {
  DerivedViewInspection,
  PluginHookExecution,
} from "./plugin_runtime.js";
import {
  collectClientEntriesImpl,
  collectGeneratedOutputsImpl,
  collectInspectorTabsImpl,
  emitCoreAssetImpl,
  enableBuildTimeImpl,
  getContentOutputDependenciesImpl,
  getDerivedViewInspectionImpl,
  getDerivedViewsImpl,
  getDiagnosticsImpl,
  getManifestHookCacheImpl,
  getManifestHookMetricsImpl,
  getNoChangeFastPathBlockReasonImpl,
  getPluginHookExecutionsImpl,
  getPluginInventoryImpl,
  getPluginMetadataImpl,
  setPageMarkdownRendererImpl,
} from "./plugin_runtime_accessors.js";
import type { PluginRuntimeContext } from "./plugin_runtime_state_types.js";

export class PluginRuntimeMethodsA {
  getDiagnostics = (): Diagnostic[] =>
    getDiagnosticsImpl(this as unknown as PluginRuntimeContext);

  getDerivedViews = (): DerivedViewRegistry =>
    getDerivedViewsImpl(this as unknown as PluginRuntimeContext);

  getDerivedViewInspection = (): readonly DerivedViewInspection[] =>
    getDerivedViewInspectionImpl(this as unknown as PluginRuntimeContext);

  setPageMarkdownRenderer = (
    renderer: (markdown: string) => Promise<string>,
  ): void =>
    setPageMarkdownRendererImpl(
      this as unknown as PluginRuntimeContext,
      renderer,
    );

  getManifestHookMetrics = (): ManifestHookMetrics =>
    getManifestHookMetricsImpl(this as unknown as PluginRuntimeContext);

  getPluginMetadata = (): readonly ResolvedPluginMetadata[] =>
    getPluginMetadataImpl(this as unknown as PluginRuntimeContext);

  getPluginInventory = (): readonly ResolvedPluginMetadata[] =>
    getPluginInventoryImpl(this as unknown as PluginRuntimeContext);

  getPluginHookExecutions = (): readonly PluginHookExecution[] =>
    getPluginHookExecutionsImpl(this as unknown as PluginRuntimeContext);

  collectInspectorTabs = async (): Promise<readonly InspectorTabSnapshot[]> =>
    await collectInspectorTabsImpl(this as unknown as PluginRuntimeContext);

  getNoChangeFastPathBlockReason = (
    previousCache: readonly ManifestHookCacheEntry[],
    pipelineFingerprint: string | undefined,
  ): string | undefined =>
    getNoChangeFastPathBlockReasonImpl(
      this as unknown as PluginRuntimeContext,
      previousCache,
      pipelineFingerprint,
    );

  getManifestHookCache = (): readonly ManifestHookCacheEntry[] =>
    getManifestHookCacheImpl(this as unknown as PluginRuntimeContext);

  enableBuildTime = (): void =>
    enableBuildTimeImpl(this as unknown as PluginRuntimeContext);

  collectClientEntries = (): PluginClientEntry[] =>
    collectClientEntriesImpl(this as unknown as PluginRuntimeContext);

  collectGeneratedOutputs = (): GeneratedOutput[] =>
    collectGeneratedOutputsImpl(this as unknown as PluginRuntimeContext);

  emitCoreAsset = (path: string, content: GeneratedOutputContent): void =>
    emitCoreAssetImpl(this as unknown as PluginRuntimeContext, path, content);

  getContentOutputDependencies = (): ContentOutputDependencyResolver =>
    getContentOutputDependenciesImpl(this as unknown as PluginRuntimeContext);
}
