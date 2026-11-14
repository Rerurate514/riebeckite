import type {
  ContentLocationInput,
  ContentManifest,
  ContentManifestEntry,
  ContentPublicLocation,
} from "../types/content_manifest.js";
import type {
  ExternalDependencyFailure,
  ExternalDependencySnapshot,
} from "../types/external_dependency.js";
import type { PluginContentLocationResolver } from "../types/plugin_context.js";
import { runPluginHook } from "./plugin_lifecycle.js";
import type { PluginRuntimeContext } from "./plugin_runtime_state_types.js";

export function startBuildImpl(
  m: PluginRuntimeContext,
  contentIndex: Map<string, string>,
): Promise<void> {
  m.buildLifecycle ??= m.runBuildLifecycle(contentIndex);
  return m.buildLifecycle;
}

export async function resolveExternalDependenciesImpl(
  m: PluginRuntimeContext,
  contentIndex: Map<string, string>,
): Promise<{
  readonly snapshots: readonly ExternalDependencySnapshot[];
  readonly failures: readonly ExternalDependencyFailure[];
}> {
  if (m.externalDependenciesResolved) {
    return {
      snapshots: [...m.externalDependencies.values()],
      failures: m.externalDependencyFailures,
    };
  }
  await m.startBuild(contentIndex);
  const snapshots = new Map<string, ExternalDependencySnapshot>();
  const failures: ExternalDependencyFailure[] = [];
  for (const plugin of m.plugins()) {
    const resolve = plugin.resolveExternalDependencies;
    if (!resolve) continue;
    const results = await m.observeHook(
      plugin,
      "resolveExternalDependencies",
      async () =>
        resolve({
          config: m.pipelineOptions.config,
          contentIndex,
          cache: m.cacheFor(plugin),
        }),
    );
    for (const result of results) {
      if (result.kind === "unavailable") {
        failures.push(result.failure);
        continue;
      }
      const snapshot = result.snapshot;
      if (snapshots.has(snapshot.id)) {
        throw new Error(
          `External dependency ID "${snapshot.id}" is declared more than once.`,
        );
      }
      snapshots.set(snapshot.id, snapshot);
    }
  }
  m.externalDependencies = snapshots;
  m.externalDependencyFailures = failures;
  m.externalDependenciesResolved = true;
  return { snapshots: [...snapshots.values()], failures };
}

export async function resolveContentLocationsImpl(
  m: PluginRuntimeContext,
  entries: readonly ContentLocationInput[],
  contentIndex: Map<string, string>,
): Promise<readonly ContentPublicLocation[]> {
  const context = { ...m.createContext(contentIndex), entries };
  const locations: ContentPublicLocation[] = [];
  for (const plugin of m.plugins()) {
    const resolver: PluginContentLocationResolver | undefined =
      plugin.resolveContentLocations;
    if (!resolver) continue;
    const pluginContext = m.createPluginContext(plugin, context);
    const resolved = await m.observeHook(
      plugin,
      "resolveContentLocations",
      () =>
        runPluginHook(
          plugin,
          "resolveContentLocations",
          pluginContext,
          resolver,
        ),
    );
    locations.push(...resolved);
  }
  return locations;
}

export function canUseDevelopmentRouteManifestImpl(
  m: PluginRuntimeContext,
): boolean {
  return m.plugins().every((plugin) => {
    if (
      plugin.resolveExternalDependencies ||
      plugin.transformAssets ||
      plugin.planGeneratedOutputs ||
      plugin.buildEnd ||
      plugin.addDiagnostics ||
      plugin.inspectGeneratedHtml ||
      plugin.assets?.length ||
      plugin.clientEntries?.length ||
      plugin.endpoints?.length ||
      plugin.seo ||
      plugin.contentOutputDependencies?.length ||
      plugin.resolveContentOutputDependencies
    ) {
      return false;
    }
    if (
      (plugin.extendContentGraph || plugin.onManifestCreated) &&
      plugin.developmentRouteManifest !== true
    ) {
      return false;
    }
    return true;
  });
}

export async function runDevelopmentRouteGraphHookImpl(
  m: PluginRuntimeContext,
  entries: ContentManifestEntry[],
  contentIndex: Map<string, string>,
): Promise<void> {
  const plugins = m
    .plugins()
    .filter((plugin) => plugin.developmentRouteManifest === true);
  await m.runHook(
    "extendContentGraph",
    (plugin) => plugin.extendContentGraph,
    { ...m.createContext(contentIndex), entries },
    plugins,
  );
}

export async function runDevelopmentRouteManifestHookImpl(
  m: PluginRuntimeContext,
  manifest: ContentManifest,
  contentIndex: Map<string, string>,
): Promise<void> {
  const plugins = m
    .plugins()
    .filter((plugin) => plugin.developmentRouteManifest === true);
  await m.runHook(
    "onManifestCreated",
    (plugin) => plugin.onManifestCreated,
    { ...m.createContext(contentIndex), manifest },
    plugins,
  );
}
