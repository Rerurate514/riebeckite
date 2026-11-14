import { fingerprintContent } from "../content/content_dependency_tracker.js";
import { derivedDependenciesToOutputDependencies } from "../derived/derived_view.js";
import type { ContentManifest } from "../types/content_manifest.js";
import type { GeneratedOutputSink } from "../types/generated_output.js";
import type { RiebeckitePlugin } from "../types/plugin.js";
import {
  freezeGeneratedOutputPlanContext,
  normalizeDerivedPath,
} from "./plugin_runtime_shared.js";
import type { PluginRuntimeContext } from "./plugin_runtime_state_types.js";

export async function runGeneratedOutputPlansImpl(
  m: PluginRuntimeContext,
  manifest: ContentManifest,
): Promise<void> {
  const plugins = m
    .plugins()
    .filter(
      (plugin) =>
        plugin.planGeneratedOutputs !== undefined ||
        plugin.planDeferredOutputs !== undefined,
    );
  if (plugins.length === 0) return;
  m.derivedOutputLinks.clear();
  m.derivedManifest = manifest;
  await m.refreshDerivedFiles();
  try {
    for (const plugin of plugins) {
      const context = freezeGeneratedOutputPlanContext({
        manifest: {
          discoverableEntries: manifest.discoverableEntries,
          routableEntries: manifest.publicEntries,
          ...(manifest.localization
            ? { localization: manifest.localization }
            : {}),
        },
        site: m.pipelineOptions.config?.site,
        theme: m.pipelineOptions.config?.theme,
        derived: m.derivedViews,
      });
      const outputs = plugin.planGeneratedOutputs
        ? await m.observeHook(
            plugin,
            "planGeneratedOutputs",
            async () => plugin.planGeneratedOutputs?.(context) ?? [],
          )
        : [];
      const deferredOutputs = plugin.planDeferredOutputs
        ? await m.observeHook(
            plugin,
            "planDeferredOutputs",
            async () => plugin.planDeferredOutputs?.(context) ?? [],
          )
        : [];
      const sink = m.generatedOutputs.sinkFor(plugin.name);
      for (const output of [...outputs, ...deferredOutputs]) {
        const viewIds = [...new Set(output.derivedViewIds ?? [])];
        const viewDependencies = viewIds.map((id) => {
          const version = m.derivedViews.versionOf(id);
          if (version === undefined) {
            throw new Error(
              `Generated output "${output.path}" from "${plugin.name}" references unregistered Derived View "${id}".`,
            );
          }
          return { type: "derived-view" as const, id, version };
        });
        const dependencies = [
          ...(output.dependencies ?? []),
          ...derivedDependenciesToOutputDependencies(
            output.derivedDependencies ?? [],
          ),
          ...viewDependencies,
        ];
        if (dependencies.length === 0) {
          throw new Error(
            `Generated output plan from "${plugin.name}" must declare at least one dependency.`,
          );
        }
        if ("generate" in output) {
          sink.emitDeferred({
            ...output,
            dependencies,
          });
        } else {
          sink.emit({
            ...output,
            dependencies,
          });
        }
        for (const viewId of viewIds) {
          const paths = m.derivedOutputLinks.get(viewId) ?? new Set();
          paths.add(output.path);
          m.derivedOutputLinks.set(viewId, paths);
        }
      }
    }
  } finally {
    m.derivedManifest = null;
    m.derivedFiles = new Map();
  }
}

export function generatedOutputSinkForImpl(
  m: PluginRuntimeContext,
  plugin: RiebeckitePlugin,
): GeneratedOutputSink {
  return m.generatedOutputs.sinkFor(plugin.name);
}

export async function refreshDerivedFilesImpl(
  m: PluginRuntimeContext,
): Promise<void> {
  const source = m.pipelineOptions.contentSource;
  if (!source) {
    m.derivedFiles = new Map();
    return;
  }
  try {
    const entries = await source.scan();
    const fingerprints = await Promise.all(
      entries.map(
        async (entry) =>
          [
            normalizeDerivedPath(entry.path),
            fingerprintContent(await source.read(entry)),
          ] as const,
      ),
    );
    m.derivedFiles = new Map(fingerprints);
  } catch {
    m.derivedFiles = new Map();
    m.observability().logger.warn(
      "Derived View file dependencies could not be refreshed.",
      { source: "derived-view" },
    );
    m.observability().tracer.event("derived-view.file-dependencies-miss", {
      source: "derived-view",
    });
  }
}
