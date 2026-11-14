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
import {
  canUseDevelopmentRouteManifestImpl,
  resolveContentLocationsImpl,
  resolveExternalDependenciesImpl,
  runDevelopmentRouteGraphHookImpl,
  runDevelopmentRouteManifestHookImpl,
  startBuildImpl,
} from "./plugin_runtime_lifecycle.js";
import { PluginRuntimeMethodsA } from "./plugin_runtime_methods_a.js";
import type { PluginRuntimeContext } from "./plugin_runtime_state_types.js";

export class PluginRuntimeMethodsB extends PluginRuntimeMethodsA {
  startBuild = (contentIndex: Map<string, string>): Promise<void> =>
    startBuildImpl(this as unknown as PluginRuntimeContext, contentIndex);

  resolveExternalDependencies = async (
    contentIndex: Map<string, string>,
  ): Promise<{
    readonly snapshots: readonly ExternalDependencySnapshot[];
    readonly failures: readonly ExternalDependencyFailure[];
  }> =>
    await resolveExternalDependenciesImpl(
      this as unknown as PluginRuntimeContext,
      contentIndex,
    );

  resolveContentLocations = async (
    entries: readonly ContentLocationInput[],
    contentIndex: Map<string, string>,
  ): Promise<readonly ContentPublicLocation[]> =>
    await resolveContentLocationsImpl(
      this as unknown as PluginRuntimeContext,
      entries,
      contentIndex,
    );

  canUseDevelopmentRouteManifest = (): boolean =>
    canUseDevelopmentRouteManifestImpl(this as unknown as PluginRuntimeContext);

  runDevelopmentRouteGraphHook = async (
    entries: ContentManifestEntry[],
    contentIndex: Map<string, string>,
  ): Promise<void> =>
    await runDevelopmentRouteGraphHookImpl(
      this as unknown as PluginRuntimeContext,
      entries,
      contentIndex,
    );

  runDevelopmentRouteManifestHook = async (
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<void> =>
    await runDevelopmentRouteManifestHookImpl(
      this as unknown as PluginRuntimeContext,
      manifest,
      contentIndex,
    );
}
