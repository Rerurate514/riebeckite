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
import { asPluginRuntimeContext } from "./plugin_runtime_state_types.js";

export class PluginRuntimeMethodsE extends PluginRuntimeMethodsD {
  resolvePage = async (
    pathname: string,
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<ResolvedPluginPage | null> =>
    await resolvePageImpl(
      asPluginRuntimeContext(this),
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
      asPluginRuntimeContext(this),
      pathname,
      manifest,
      contentIndex,
    );

  getPagePaths = async (
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<readonly string[]> =>
    await getPagePathsImpl(
      asPluginRuntimeContext(this),
      manifest,
      contentIndex,
    );

  resolveContentLocalization = async (
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<ContentManifest["localization"] | undefined> =>
    await resolveContentLocalizationImpl(
      asPluginRuntimeContext(this),
      manifest,
      contentIndex,
    );

  getPageRoutes = async (
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<readonly PluginPageRoute[]> =>
    await getPageRoutesImpl(
      asPluginRuntimeContext(this),
      manifest,
      contentIndex,
    );

  getPageOutputs = async (
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<readonly OutputDescriptor[]> =>
    await getPageOutputsImpl(
      asPluginRuntimeContext(this),
      manifest,
      contentIndex,
    );

  collectDiagnostics = async (
    contentIndex: Map<string, string>,
  ): Promise<Diagnostic[]> =>
    await collectDiagnosticsImpl(asPluginRuntimeContext(this), contentIndex);

  observeHook = async <T>(
    plugin: RiebeckitePlugin,
    hook: string,
    operation: () => Promise<T>,
  ): Promise<T> =>
    await observeHookImpl(
      asPluginRuntimeContext(this),
      plugin,
      hook,
      operation,
    );

  observability = (): Observability =>
    observabilityImpl(asPluginRuntimeContext(this));
}
