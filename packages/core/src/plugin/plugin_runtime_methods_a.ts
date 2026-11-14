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
import { asPluginRuntimeContext } from "./plugin_runtime_state_types.js";

export class PluginRuntimeMethodsA {
  getDiagnostics = (): Diagnostic[] =>
    getDiagnosticsImpl(asPluginRuntimeContext(this));

  getDerivedViews = (): DerivedViewRegistry =>
    getDerivedViewsImpl(asPluginRuntimeContext(this));

  getDerivedViewInspection = (): readonly DerivedViewInspection[] =>
    getDerivedViewInspectionImpl(asPluginRuntimeContext(this));

  setPageMarkdownRenderer = (
    renderer: (markdown: string) => Promise<string>,
  ): void =>
    setPageMarkdownRendererImpl(asPluginRuntimeContext(this), renderer);

  getManifestHookMetrics = (): ManifestHookMetrics =>
    getManifestHookMetricsImpl(asPluginRuntimeContext(this));

  getPluginMetadata = (): readonly ResolvedPluginMetadata[] =>
    getPluginMetadataImpl(asPluginRuntimeContext(this));

  getPluginInventory = (): readonly ResolvedPluginMetadata[] =>
    getPluginInventoryImpl(asPluginRuntimeContext(this));

  getPluginHookExecutions = (): readonly PluginHookExecution[] =>
    getPluginHookExecutionsImpl(asPluginRuntimeContext(this));

  collectInspectorTabs = async (): Promise<readonly InspectorTabSnapshot[]> =>
    await collectInspectorTabsImpl(asPluginRuntimeContext(this));

  getNoChangeFastPathBlockReason = (
    previousCache: readonly ManifestHookCacheEntry[],
    pipelineFingerprint: string | undefined,
  ): string | undefined =>
    getNoChangeFastPathBlockReasonImpl(
      asPluginRuntimeContext(this),
      previousCache,
      pipelineFingerprint,
    );

  getManifestHookCache = (): readonly ManifestHookCacheEntry[] =>
    getManifestHookCacheImpl(asPluginRuntimeContext(this));

  enableBuildTime = (): void =>
    enableBuildTimeImpl(asPluginRuntimeContext(this));

  collectClientEntries = (): PluginClientEntry[] =>
    collectClientEntriesImpl(asPluginRuntimeContext(this));

  collectGeneratedOutputs = (): GeneratedOutput[] =>
    collectGeneratedOutputsImpl(asPluginRuntimeContext(this));

  emitCoreAsset = (path: string, content: GeneratedOutputContent): void =>
    emitCoreAssetImpl(asPluginRuntimeContext(this), path, content);

  getContentOutputDependencies = (): ContentOutputDependencyResolver =>
    getContentOutputDependenciesImpl(asPluginRuntimeContext(this));
}
