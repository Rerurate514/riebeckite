import type { OutputDescriptor } from "../content/output_dependency.js";
import type { Observability } from "../observability.js";
import type {
  ContentManifest,
  PluginPageRoute,
} from "../types/content_manifest.js";
import type { Diagnostic } from "../types/diagnostic.js";
import type { RiebeckitePlugin } from "../types/plugin.js";
import type { ResolvedPluginPage } from "../types/plugin_page.js";
import { PluginRuntimeMethodsD } from "./plugin_runtime_methods_d.js";
import {
  collectDiagnosticsImpl,
  getPageOutputsImpl,
  getPagePathsImpl,
  getPageRoutesImpl,
  observabilityImpl,
  observeHookImpl,
  resolveContentLocalizationImpl,
  resolvePageImpl,
  resolveRouteImpl,
} from "./plugin_runtime_pages.js";
import type { PluginRuntimeContext } from "./plugin_runtime_state_types.js";

export class PluginRuntimeMethodsE extends PluginRuntimeMethodsD {
  resolvePage = async (
    pathname: string,
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<ResolvedPluginPage | null> =>
    await resolvePageImpl(
      this as unknown as PluginRuntimeContext,
      pathname,
      manifest,
      contentIndex,
    );

  resolveRoute = async (
    pathname: string,
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<ResolvedPluginPage | null | undefined> =>
    await resolveRouteImpl(
      this as unknown as PluginRuntimeContext,
      pathname,
      manifest,
      contentIndex,
    );

  getPagePaths = async (
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<readonly string[]> =>
    await getPagePathsImpl(
      this as unknown as PluginRuntimeContext,
      manifest,
      contentIndex,
    );

  resolveContentLocalization = async (
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<ContentManifest["localization"] | undefined> =>
    await resolveContentLocalizationImpl(
      this as unknown as PluginRuntimeContext,
      manifest,
      contentIndex,
    );

  getPageRoutes = async (
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<readonly PluginPageRoute[]> =>
    await getPageRoutesImpl(
      this as unknown as PluginRuntimeContext,
      manifest,
      contentIndex,
    );

  getPageOutputs = async (
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<readonly OutputDescriptor[]> =>
    await getPageOutputsImpl(
      this as unknown as PluginRuntimeContext,
      manifest,
      contentIndex,
    );

  collectDiagnostics = async (
    contentIndex: Map<string, string>,
  ): Promise<Diagnostic[]> =>
    await collectDiagnosticsImpl(
      this as unknown as PluginRuntimeContext,
      contentIndex,
    );

  observeHook = async <T>(
    plugin: RiebeckitePlugin,
    hook: string,
    operation: () => Promise<T>,
  ): Promise<T> =>
    await observeHookImpl(
      this as unknown as PluginRuntimeContext,
      plugin,
      hook,
      operation,
    );

  observability = (): Observability =>
    observabilityImpl(this as unknown as PluginRuntimeContext);
}
