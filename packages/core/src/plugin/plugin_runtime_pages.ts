import type { OutputDescriptor } from "../content/output_dependency.js";
import { noopObservability, type Observability } from "../observability.js";
import type {
  ContentManifest,
  PluginPageRoute,
} from "../types/content_manifest.js";
import type { Diagnostic } from "../types/diagnostic.js";
import type { RiebeckitePlugin } from "../types/plugin.js";
import type { ResolvedPluginPage } from "../types/plugin_page.js";
import { runPluginHook } from "./plugin_lifecycle.js";
import { countSeverity } from "./plugin_runtime_shared.js";
import type { PluginRuntimeContext } from "./plugin_runtime_state_types.js";

export async function resolvePageImpl(
  m: PluginRuntimeContext,
  pathname: string,
  manifest: ContentManifest,
  contentIndex: Map<string, string>,
): Promise<ResolvedPluginPage | null> {
  return await m.pageResolver.resolvePage(pathname, manifest, contentIndex);
}

export async function resolveRouteImpl(
  m: PluginRuntimeContext,
  pathname: string,
  manifest: ContentManifest,
  contentIndex: Map<string, string>,
): Promise<ResolvedPluginPage | null | undefined> {
  return await m.pageResolver.resolveRoute(pathname, manifest, contentIndex);
}

export async function getPagePathsImpl(
  m: PluginRuntimeContext,
  manifest: ContentManifest,
  contentIndex: Map<string, string>,
): Promise<readonly string[]> {
  return await m.pageResolver.getPagePaths(manifest, contentIndex);
}

export async function resolveContentLocalizationImpl(
  m: PluginRuntimeContext,
  manifest: ContentManifest,
  contentIndex: Map<string, string>,
): Promise<ContentManifest["localization"] | undefined> {
  const context = {
    ...m.createContext(contentIndex),
    manifest,
  };
  for (const plugin of m.plugins()) {
    const hook = plugin.resolveContentLocalization;
    if (!hook) continue;
    const localization = await m.observeHook(
      plugin,
      "resolveContentLocalization",
      async () => await hook(m.createPluginContext(plugin, context)),
    );
    if (localization) return localization;
  }
  return undefined;
}

export async function getPageRoutesImpl(
  m: PluginRuntimeContext,
  manifest: ContentManifest,
  contentIndex: Map<string, string>,
): Promise<readonly PluginPageRoute[]> {
  return await m.pageResolver.getPageRoutes(manifest, contentIndex);
}

export async function getPageOutputsImpl(
  m: PluginRuntimeContext,
  manifest: ContentManifest,
  contentIndex: Map<string, string>,
): Promise<readonly OutputDescriptor[]> {
  return await m.pageResolver.getPageOutputs(manifest, contentIndex);
}

export async function collectDiagnosticsImpl(
  m: PluginRuntimeContext,
  contentIndex: Map<string, string>,
): Promise<Diagnostic[]> {
  const tracer = m.observability().tracer;
  return await tracer.span("diagnostics.run", {}, async () => {
    const results: Diagnostic[] = [];
    const context = m.createContext(contentIndex);
    for (const plugin of m.plugins()) {
      const hook = plugin.addDiagnostics;
      const diagnostics = hook
        ? await m.observeHook(plugin, "addDiagnostics", () =>
            runPluginHook(
              plugin,
              "addDiagnostics",
              m.createPluginContext(plugin, context),
              hook,
            ),
          )
        : undefined;
      for (const diagnostic of diagnostics ?? []) {
        results.push({
          ...diagnostic,
          pluginName: diagnostic.pluginName || plugin.name,
        });
      }
    }
    tracer.event("diagnostics.summary", {
      total: results.length,
      errors: countSeverity(results, "error"),
      warnings: countSeverity(results, "warning"),
      info: countSeverity(results, "info"),
    });
    return results;
  });
}

export async function observeHookImpl<T>(
  m: PluginRuntimeContext,
  plugin: RiebeckitePlugin,
  hook: string,
  operation: () => Promise<T>,
): Promise<T> {
  const sequence = ++m.hookSequence;
  const startedAt = performance.now();
  try {
    const result = await operation();
    m.recordHookExecution(
      plugin,
      hook,
      "executed",
      performance.now() - startedAt,
      sequence,
    );
    return result;
  } catch (error) {
    m.recordHookExecution(
      plugin,
      hook,
      "failed",
      performance.now() - startedAt,
      sequence,
    );
    throw error;
  }
}

export function observabilityImpl(m: PluginRuntimeContext): Observability {
  return m.pipelineOptions.observability ?? noopObservability;
}
