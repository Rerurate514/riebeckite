import type { ManifestHookCacheEntry } from "../content/content_build_state.js";
import type { OutputDescriptor } from "../content/output_dependency.js";
import type {
  DerivedViewExecution,
  DerivedViewRegistry,
} from "../derived/derived_view.js";
import type { Observability } from "../observability.js";
import type { PipelineOptions } from "../pipeline.js";
import type {
  ContentLocationInput,
  ContentManifest,
  ContentManifestEntry,
  ContentPublicLocation,
  PluginPageRoute,
} from "../types/content_manifest.js";
import type { Diagnostic } from "../types/diagnostic.js";
import type {
  ExternalDependencyFailure,
  ExternalDependencySnapshot,
} from "../types/external_dependency.js";
import type {
  GeneratedOutput,
  GeneratedOutputContent,
  GeneratedOutputSink,
} from "../types/generated_output.js";
import type { JsonValue } from "../types/json_value.js";
import type {
  AssetTransformOutput,
  ContentOutputDependencyResolver,
  ResolvedPluginMetadata,
  RiebeckitePlugin,
} from "../types/plugin.js";
import { resolvePlugins } from "../types/plugin.js";
import type { PluginClientEntry } from "../types/plugin_asset.js";
import type { InspectorTabSnapshot } from "../types/plugin_inspector.js";
import type { ResolvedPluginPage } from "../types/plugin_page.js";
import type { PostContent } from "../types/post_content.js";
import type {
  ManifestHookMetrics,
  ManifestHookRunner,
} from "./manifest_hooks.js";
import type { PluginCache } from "./plugin_cache.js";
import { runDispose, runPluginHook } from "./plugin_lifecycle.js";
import { collectPageTypeOwners } from "./plugin_pages.js";
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
import type {
  PluginContextBase,
  PluginContextWithCache,
} from "./plugin_runtime_context.js";
import {
  generatedOutputSinkForImpl,
  refreshDerivedFilesImpl,
  runGeneratedOutputPlansImpl,
} from "./plugin_runtime_generated_outputs.js";
import {
  canUseDevelopmentRouteManifestImpl,
  resolveContentLocationsImpl,
  resolveExternalDependenciesImpl,
  runDevelopmentRouteGraphHookImpl,
  runDevelopmentRouteManifestHookImpl,
  startBuildImpl,
} from "./plugin_runtime_lifecycle.js";
import {
  cacheForImpl,
  createContextImpl,
  createPluginContextImpl,
  derivedCacheImpl,
  registerAssetTransformsImpl,
  runAssetTransformsImpl,
} from "./plugin_runtime_outputs.js";
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
import { assertUniqueDerivedViewIds } from "./plugin_runtime_shared.js";
import { initializePluginRuntime } from "./plugin_runtime_state.js";
import { asPluginRuntimeContext } from "./plugin_runtime_state_types.js";

export type {
  ManifestHookMetrics,
  ManifestHookPluginMetrics,
} from "./manifest_hooks.js";

export type DerivedViewInspection = DerivedViewExecution & {
  readonly outputPaths: readonly string[];
};

export type PluginHookExecution = {
  readonly sequence: number;
  readonly plugin: string;
  readonly hook: string;
  readonly status: "executed" | "failed" | "reused";
  readonly durationMs: number;
};

export type DevelopmentRouteCacheSnapshot = {
  readonly name: string;
  readonly version: string;
  readonly state?: JsonValue;
};

export class PluginRuntime {
  private pipelineOptions!: PipelineOptions;
  private buildLifecycle!: Promise<void> | null;
  private disposed!: boolean;
  private readonly derivedViews!: DerivedViewRegistry;
  private resolvedPlugins!: RiebeckitePlugin[] | null;
  private readonly manifestHooks!: ManifestHookRunner;
  private hookSequence!: number;
  private hookExecutions!: PluginHookExecution[];

  constructor(pipelineOptions: PipelineOptions = {}) {
    initializePluginRuntime(asPluginRuntimeContext(this), pipelineOptions);
  }

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

  startBuild = (contentIndex: Map<string, string>): Promise<void> =>
    startBuildImpl(asPluginRuntimeContext(this), contentIndex);

  resolveExternalDependencies = async (
    contentIndex: Map<string, string>,
  ): Promise<{
    readonly snapshots: readonly ExternalDependencySnapshot[];
    readonly failures: readonly ExternalDependencyFailure[];
  }> =>
    await resolveExternalDependenciesImpl(
      asPluginRuntimeContext(this),
      contentIndex,
    );

  resolveContentLocations = async (
    entries: readonly ContentLocationInput[],
    contentIndex: Map<string, string>,
  ): Promise<readonly ContentPublicLocation[]> =>
    await resolveContentLocationsImpl(
      asPluginRuntimeContext(this),
      entries,
      contentIndex,
    );

  canUseDevelopmentRouteManifest = (): boolean =>
    canUseDevelopmentRouteManifestImpl(asPluginRuntimeContext(this));

  runDevelopmentRouteGraphHook = async (
    entries: ContentManifestEntry[],
    contentIndex: Map<string, string>,
  ): Promise<void> =>
    await runDevelopmentRouteGraphHookImpl(
      asPluginRuntimeContext(this),
      entries,
      contentIndex,
    );

  runDevelopmentRouteManifestHook = async (
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<void> =>
    await runDevelopmentRouteManifestHookImpl(
      asPluginRuntimeContext(this),
      manifest,
      contentIndex,
    );

  runAssetTransforms = async (manifest: ContentManifest): Promise<void> =>
    await runAssetTransformsImpl(asPluginRuntimeContext(this), manifest);

  registerAssetTransforms = (
    plugin: RiebeckitePlugin,
    outputs: readonly AssetTransformOutput[],
    referencedBy: ReadonlyMap<string, readonly ContentManifestEntry[]>,
  ): void =>
    registerAssetTransformsImpl(
      asPluginRuntimeContext(this),
      plugin,
      outputs,
      referencedBy,
    );

  derivedCache = (): PluginCache =>
    derivedCacheImpl(asPluginRuntimeContext(this));

  cacheFor = (plugin: RiebeckitePlugin): PluginCache =>
    cacheForImpl(asPluginRuntimeContext(this), plugin);

  createContext = (contentIndex: Map<string, string>): PluginContextBase =>
    createContextImpl(asPluginRuntimeContext(this), contentIndex);

  createPluginContext = <TContext extends PluginContextBase>(
    plugin: RiebeckitePlugin,
    context: TContext,
  ): PluginContextWithCache<TContext> =>
    createPluginContextImpl(asPluginRuntimeContext(this), plugin, context);

  runGeneratedOutputPlans = async (manifest: ContentManifest): Promise<void> =>
    await runGeneratedOutputPlansImpl(asPluginRuntimeContext(this), manifest);

  generatedOutputSinkFor = (plugin: RiebeckitePlugin): GeneratedOutputSink =>
    generatedOutputSinkForImpl(asPluginRuntimeContext(this), plugin);

  refreshDerivedFiles = async (): Promise<void> =>
    await refreshDerivedFilesImpl(asPluginRuntimeContext(this));

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

  async runContentLoaded(
    slug: string,
    markdown: string,
    contentIndex: Map<string, string>,
  ) {
    await this.runHook("onContentLoaded", (plugin) => plugin.onContentLoaded, {
      ...this.createContext(contentIndex),
      slug,
      markdown,
    });
  }

  getDevelopmentRouteCacheSnapshots():
    | readonly DevelopmentRouteCacheSnapshot[]
    | undefined {
    const snapshots: DevelopmentRouteCacheSnapshot[] = [];
    for (const plugin of this.plugins()) {
      if (
        !plugin.resolveContentLocations &&
        !plugin.extendContentLocations &&
        !plugin.resolveContentLocalization &&
        !(
          plugin.developmentRouteManifest === true &&
          (plugin.extendContentGraph || plugin.onManifestCreated)
        )
      ) {
        continue;
      }
      const cache = plugin.developmentRouteCache;
      if (!cache) {
        throw new Error(
          `Plugin "${plugin.name}" participates in development route caching (content locations, localization, or route manifest) but does not declare developmentRouteCache. Add a developmentRouteCache descriptor with a version string.`,
        );
      }
      snapshots.push({
        name: plugin.name,
        version: cache.version,
        ...(cache.serialize ? { state: cache.serialize() } : {}),
      });
    }
    return snapshots;
  }

  async restoreDevelopmentRouteCache(
    snapshots: readonly DevelopmentRouteCacheSnapshot[],
  ): Promise<boolean> {
    const current = this.getDevelopmentRouteCacheSnapshots();
    if (
      !current ||
      current.length !== snapshots.length ||
      current.some(
        (snapshot, index) =>
          snapshot.name !== snapshots[index]?.name ||
          snapshot.version !== snapshots[index]?.version,
      )
    ) {
      return false;
    }
    for (const snapshot of snapshots) {
      if (snapshot.state === undefined) continue;
      const plugin = this.plugins().find(({ name }) => name === snapshot.name);
      if (!plugin?.developmentRouteCache?.restore) return false;
      await plugin.developmentRouteCache.restore(snapshot.state);
    }
    return true;
  }

  getMarkdownComponents() {
    return this.plugins().flatMap((plugin) => plugin.markdownComponents ?? []);
  }

  getHastTransforms() {
    return this.plugins().flatMap((plugin) => plugin.hastTransforms ?? []);
  }

  async runGraphHook(
    entries: ContentManifestEntry[],
    contentIndex: Map<string, string>,
  ) {
    await this.runHook(
      "extendContentGraph",
      (plugin) => plugin.extendContentGraph,
      {
        ...this.createContext(contentIndex),
        entries,
      },
    );
  }

  async extendContentLocations(
    entries: readonly ContentLocationInput[],
    locations: Map<string, ContentPublicLocation>,
    contentIndex: Map<string, string>,
  ) {
    await this.runHook(
      "extendContentLocations",
      (plugin) => plugin.extendContentLocations,
      {
        ...this.createContext(contentIndex),
        entries,
        locations,
      },
    );
  }

  async runPostHook(
    hookName: "onPostParsed" | "onPostProcessed",
    slug: string,
    markdown: string,
    content: PostContent,
    contentIndex: Map<string, string>,
  ) {
    await this.runHook(hookName, (plugin) => plugin[hookName], {
      ...this.createContext(contentIndex),
      slug,
      markdown,
      content,
    });
  }

  async runManifestCreated(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
    previousCache: readonly ManifestHookCacheEntry[] = [],
    pipelineFingerprint: string | undefined,
  ) {
    await this.manifestHooks.runManifestCreated(
      manifest,
      contentIndex,
      previousCache,
      pipelineFingerprint,
    );
  }

  async runBuildEnd(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ) {
    await this.runHook("buildEnd", (plugin) => plugin.buildEnd, {
      ...this.createContext(contentIndex),
      manifest,
    });
  }

  async dispose(contentIndex: Map<string, string>) {
    if (this.disposed) return;

    this.disposed = true;
    await this.buildLifecycle?.catch(() => undefined);
    if (this.buildLifecycle === null) {
      this.derivedViews.dispose();
      return;
    }
    const context = this.createContext(contentIndex);
    try {
      await runDispose(this.plugins(), (plugin) =>
        this.createPluginContext(plugin, context),
      );
    } finally {
      this.derivedViews.dispose();
    }
  }

  collectAssets() {
    return this.plugins().flatMap((plugin) =>
      (plugin.assets ?? []).map((asset) => ({
        ...asset,
        path: asset.moduleSpecifier,
        pluginName: asset.pluginName || plugin.name,
      })),
    );
  }

  async runBuildLifecycle(contentIndex: Map<string, string>): Promise<void> {
    const context = this.createContext(contentIndex);
    const stages: readonly (() => Promise<void>)[] = [
      () => this.runHook("setup", (plugin) => plugin.setup, context),
      () => this.runHook("buildStart", (plugin) => plugin.buildStart, context),
      () =>
        this.runHook(
          "onConfigResolved",
          (plugin) => plugin.onConfigResolved,
          context,
        ),
    ];

    for (const run of stages) {
      await run();
    }
  }

  async runHook<TContext extends PluginContextBase>(
    hookName: string,
    hook: (
      plugin: NonNullable<PipelineOptions["plugins"]>[number],
    ) =>
      | ((context: PluginContextWithCache<TContext>) => void | Promise<void>)
      | undefined,
    context: TContext,
    plugins = this.plugins(),
  ) {
    for (const plugin of plugins) {
      const pluginHook = hook(plugin);
      if (!pluginHook) continue;
      const pluginContext = this.createPluginContext(plugin, context);
      await this.observeHook(plugin, hookName, () =>
        runPluginHook(plugin, hookName, pluginContext, pluginHook),
      );
    }
  }

  recordHookExecution(
    plugin: RiebeckitePlugin,
    hook: string,
    status: PluginHookExecution["status"],
    durationMs: number,
    sequence = ++this.hookSequence,
  ): void {
    this.hookExecutions.push({
      sequence,
      plugin: plugin.name,
      hook,
      status,
      durationMs,
    });
  }

  plugins() {
    if (this.resolvedPlugins === null) {
      const resolved = resolvePlugins(this.pipelineOptions.plugins);
      collectPageTypeOwners(resolved);
      assertUniqueDerivedViewIds(resolved);
      for (const plugin of resolved) {
        for (const view of plugin.derivedViews ?? [])
          this.derivedViews.register(view);
      }
      this.resolvedPlugins = resolved;
    }
    return this.resolvedPlugins;
  }
}
