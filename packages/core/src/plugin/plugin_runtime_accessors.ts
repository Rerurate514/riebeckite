import type { ManifestHookCacheEntry } from "../content/content_build_state.js";
import type { DerivedViewRegistry } from "../derived/derived_view.js";
import type { Diagnostic } from "../types/diagnostic.js";
import type {
  GeneratedOutput,
  GeneratedOutputContent,
} from "../types/generated_output.js";
import {
  type ContentOutputDependencyResolver,
  getResolvedPluginMetadata,
  type ResolvedPluginMetadata,
  type RiebeckitePlugin,
} from "../types/plugin.js";
import {
  type PluginClientEntry,
  serializePublicClientConfig,
} from "../types/plugin_asset.js";
import type { InspectorTabSnapshot } from "../types/plugin_inspector.js";
import type { ManifestHookMetrics } from "./manifest_hooks.js";
import { runPluginHook } from "./plugin_lifecycle.js";
import type {
  DerivedViewInspection,
  PluginHookExecution,
} from "./plugin_runtime.js";
import type { PluginRuntimeContext } from "./plugin_runtime_state_types.js";

export function getDiagnosticsImpl(m: PluginRuntimeContext): Diagnostic[] {
  return m.diagnostics;
}

export function getDerivedViewsImpl(
  m: PluginRuntimeContext,
): DerivedViewRegistry {
  return m.derivedViews;
}

export function getDerivedViewInspectionImpl(
  m: PluginRuntimeContext,
): readonly DerivedViewInspection[] {
  return m.derivedViews.inspect().map((view) => ({
    ...view,
    dependencies: [...view.dependencies],
    outputPaths: [...(m.derivedOutputLinks.get(view.id) ?? [])].sort(),
  }));
}

export function setPageMarkdownRendererImpl(
  m: PluginRuntimeContext,
  renderer: (markdown: string) => Promise<string>,
): void {
  m.pageMarkdownRenderer = renderer;
}

export function getManifestHookMetricsImpl(
  m: PluginRuntimeContext,
): ManifestHookMetrics {
  return m.manifestHooks.getMetrics();
}

export function getPluginMetadataImpl(
  m: PluginRuntimeContext,
): readonly ResolvedPluginMetadata[] {
  return getResolvedPluginMetadata(m.plugins());
}

export function getPluginInventoryImpl(
  m: PluginRuntimeContext,
): readonly ResolvedPluginMetadata[] {
  const resolved = m.plugins();
  const resolvedNames = new Set(resolved.map((plugin) => plugin.name));
  const configured =
    m.pipelineOptions.config?.pluginInventory ??
    (m.pipelineOptions.plugins ?? [])
      .filter((plugin): plugin is RiebeckitePlugin => Boolean(plugin))
      .map((plugin) => ({
        name: plugin.name,
        enabled: plugin.enabled !== false,
        provides: plugin.provides ?? [],
        requires: plugin.requires ?? [],
        optional: plugin.optional ?? [],
      }));
  return [
    ...getResolvedPluginMetadata(resolved),
    ...configured
      .filter((plugin) => !resolvedNames.has(plugin.name))
      .map((plugin) => ({ ...plugin, enabled: false })),
  ];
}

export function getPluginHookExecutionsImpl(
  m: PluginRuntimeContext,
): readonly PluginHookExecution[] {
  return [...m.hookExecutions];
}

export async function collectInspectorTabsImpl(
  m: PluginRuntimeContext,
): Promise<readonly InspectorTabSnapshot[]> {
  const tabs: InspectorTabSnapshot[] = [];
  const ids = new Set<string>();
  const context = m.createContext(m.contentIndex);
  for (const plugin of m.plugins()) {
    const extension = plugin.inspector;
    if (!extension) continue;
    if (extension.apiVersion !== 1) {
      m.observability().logger.warn(
        `Plugin "${plugin.name}" declares an unsupported Inspector API version.`,
      );
      continue;
    }
    for (const tab of extension.tabs) {
      if (!/^[a-z0-9][a-z0-9._-]*$/i.test(tab.id)) {
        m.observability().logger.warn(
          `Plugin "${plugin.name}" declares an invalid Inspector tab id "${tab.id}".`,
        );
        continue;
      }
      if (ids.has(tab.id)) {
        m.observability().logger.warn(
          `Plugin "${plugin.name}" declares duplicate Inspector tab id "${tab.id}".`,
        );
        continue;
      }
      ids.add(tab.id);
      const pluginContext = m.createPluginContext(plugin, context);
      const collect = tab.collect;
      try {
        const data = collect
          ? await m.observeHook(plugin, `inspector.${tab.id}`, () =>
              runPluginHook(plugin, `inspector.${tab.id}`, pluginContext, () =>
                collect(pluginContext),
              ),
            )
          : undefined;
        tabs.push({
          plugin: plugin.name,
          id: tab.id,
          title: tab.title,
          description: tab.description,
          order: tab.order ?? 0,
          client: tab.client,
          data,
        });
      } catch (error) {
        const cause =
          error instanceof Error
            ? (error as Error & { cause?: unknown }).cause
            : undefined;
        tabs.push({
          plugin: plugin.name,
          id: tab.id,
          title: tab.title,
          description: tab.description,
          order: tab.order ?? 0,
          client: tab.client,
          error:
            cause instanceof Error
              ? cause.message
              : error instanceof Error
                ? error.message
                : String(error),
        });
      }
    }
  }
  return tabs;
}

export function getNoChangeFastPathBlockReasonImpl(
  m: PluginRuntimeContext,
  previousCache: readonly ManifestHookCacheEntry[],
  pipelineFingerprint: string | undefined,
): string | undefined {
  return m.manifestHooks.getNoChangeFastPathBlockReason(
    previousCache,
    pipelineFingerprint,
  );
}

export function getManifestHookCacheImpl(
  m: PluginRuntimeContext,
): readonly ManifestHookCacheEntry[] {
  return m.manifestHooks.getCache();
}

export function enableBuildTimeImpl(m: PluginRuntimeContext): void {
  m.isBuildTime = true;
}

export function collectClientEntriesImpl(
  m: PluginRuntimeContext,
): PluginClientEntry[] {
  return m.plugins().flatMap((plugin) =>
    (plugin.clientEntries ?? []).map((entry) => {
      if (entry.publicConfig !== undefined) {
        serializePublicClientConfig(entry.publicConfig);
      }
      return entry;
    }),
  );
}

export function collectGeneratedOutputsImpl(
  m: PluginRuntimeContext,
): GeneratedOutput[] {
  return m.generatedOutputs.all();
}

export function emitCoreAssetImpl(
  m: PluginRuntimeContext,
  path: string,
  content: GeneratedOutputContent,
): void {
  m.generatedOutputs.sinkFor("core").emitAsset({
    path,
    content,
    dependencies: [{ type: "file", path }],
  });
}

export function getContentOutputDependenciesImpl(
  m: PluginRuntimeContext,
): ContentOutputDependencyResolver {
  const plugins = m.plugins();
  return ({ entry, manifest }) =>
    plugins.flatMap((plugin) => [
      ...(plugin.contentOutputDependencies ?? []),
      ...(plugin.resolveContentOutputDependencies?.({ entry, manifest }) ?? []),
    ]);
}
