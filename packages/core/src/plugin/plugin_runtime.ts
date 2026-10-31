import type { ManifestHookCacheEntry } from "../content/content_build_state.js";
import { fingerprintContent } from "../content/content_dependency_tracker.js";
import { getContentSourceEntry } from "../content/content_source.js";
import { fingerprintExternalValue } from "../content/external_fingerprint.js";
import {
  contentQueryValue,
  type OutputDescriptor,
} from "../content/output_dependency.js";
import {
  createDerivedViewRegistry,
  type DerivedViewExecution,
  type DerivedViewRegistry,
  derivedDependenciesToOutputDependencies,
} from "../derived/derived_view.js";
import type { Observability } from "../observability.js";
import { noopObservability } from "../observability.js";
import type { PipelineOptions } from "../pipeline.js";
import type {
  ContentAsset,
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
import type {
  AssetTransformOutput,
  ContentOutputDependencyResolver,
  ResolvedPluginMetadata,
  RiebeckitePlugin,
} from "../types/plugin.js";
import { getResolvedPluginMetadata, resolvePlugins } from "../types/plugin.js";
import {
  type PluginClientEntry,
  serializePublicClientConfig,
} from "../types/plugin_asset.js";
import type {
  PluginContentLocationResolver,
  PluginContext,
} from "../types/plugin_context.js";
import type { ResolvedPluginPage } from "../types/plugin_page.js";
import type { PostContent } from "../types/post_content.js";
import type { ResolvedRiebeckiteConfig } from "../types/resolved_riebeckite_config.js";
import { GeneratedOutputRegistry } from "./generated_output_registry.js";
import {
  type ManifestHookMetrics,
  ManifestHookRunner,
} from "./manifest_hooks.js";
import type { PluginCache } from "./plugin_cache.js";
import {
  createPluginCache,
  createUnavailablePluginCache,
  resolvePluginCacheDirectory,
} from "./plugin_cache.js";
import { runDispose, runPluginHook } from "./plugin_lifecycle.js";
import { collectPageTypeOwners, PluginPageResolver } from "./plugin_pages.js";
import type {
  PluginContextBase,
  PluginContextWithCache,
} from "./plugin_runtime_context.js";

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

export class PluginRuntime {
  private buildLifecycle: Promise<void> | null = null;
  private disposed = false;
  private diagnostics: PluginContext["diagnostics"] = [];
  private pluginCaches = new Map<string, PluginCache>();
  private readonly derivedViews: DerivedViewRegistry;
  private contentIndex = new Map<string, string>();
  private generatedOutputs = new GeneratedOutputRegistry();
  private isBuildTime = false;
  private resolvedPlugins: RiebeckitePlugin[] | null = null;
  private externalDependencies = new Map<string, ExternalDependencySnapshot>();
  private externalDependencyFailures: ExternalDependencyFailure[] = [];
  private externalDependenciesResolved = false;
  private derivedFiles = new Map<string, string>();
  private derivedManifest: ContentManifest | null = null;
  private derivedOutputLinks = new Map<string, Set<string>>();
  private readonly pageResolver: PluginPageResolver;
  private readonly manifestHooks: ManifestHookRunner;
  private pageMarkdownRenderer: ((markdown: string) => Promise<string>) | null =
    null;
  private hookSequence = 0;
  private hookExecutions: PluginHookExecution[] = [];

  constructor(private pipelineOptions: PipelineOptions = {}) {
    this.derivedViews = createDerivedViewRegistry({
      cache: () => this.derivedCache(),
      queryEntries: (pool) => {
        const manifest = this.derivedManifest;
        if (!manifest) {
          throw new Error(
            "Content queries are available only during generated output planning.",
          );
        }
        return pool === "routable"
          ? manifest.publicEntries
          : manifest.discoverableEntries;
      },
      dependencyFingerprint: (dependency) => {
        if (dependency.type === "content") {
          const target = this.contentIndex.get(dependency.id.toLowerCase());
          if (target === undefined) return undefined;
          const fingerprint = this.derivedFiles.get(
            normalizeDerivedPath(`${target}.md`),
          );
          return fingerprint === undefined
            ? undefined
            : fingerprintDerivedValue({ target, fingerprint });
        }
        if (dependency.type === "external") {
          return this.externalDependencies.get(dependency.id)?.fingerprint;
        }
        if (dependency.type === "file") {
          return this.derivedFiles.get(normalizeDerivedPath(dependency.id));
        }
        if (dependency.type === "frontmatter") {
          const entry = this.derivedManifest?.bySlug.get(dependency.id);
          if (!entry || !dependency.property) return undefined;
          return fingerprintDerivedValue(
            contentQueryValue(entry, dependency.property),
          );
        }
        return undefined;
      },
    });
    this.pageResolver = new PluginPageResolver({
      plugins: () => this.plugins(),
      createContext: (contentIndex) => this.createContext(contentIndex),
      createPluginContext: (plugin, context) =>
        this.createPluginContext(plugin, context),
      renderMarkdown: async (markdown) => {
        if (!this.pageMarkdownRenderer) {
          throw new Error("Plugin page Markdown renderer is unavailable.");
        }
        return await this.pageMarkdownRenderer(markdown);
      },
    });
    this.manifestHooks = new ManifestHookRunner({
      plugins: () => this.plugins(),
      createContext: (contentIndex) => this.createContext(contentIndex),
      createPluginContext: (plugin, context) =>
        this.createPluginContext(plugin, context),
      generatedOutputCount: () => this.generatedOutputs.count(),
      diagnosticCount: () => this.diagnostics.length,
      recordExecution: (plugin, hook, status, durationMs) =>
        this.recordHookExecution(plugin, hook, status, durationMs),
    });
  }

  getDiagnostics(): Diagnostic[] {
    return this.diagnostics;
  }

  getDerivedViews(): DerivedViewRegistry {
    return this.derivedViews;
  }

  getDerivedViewInspection(): readonly DerivedViewInspection[] {
    return this.derivedViews.inspect().map((view) => ({
      ...view,
      dependencies: [...view.dependencies],
      outputPaths: [...(this.derivedOutputLinks.get(view.id) ?? [])].sort(),
    }));
  }

  setPageMarkdownRenderer(
    renderer: (markdown: string) => Promise<string>,
  ): void {
    this.pageMarkdownRenderer = renderer;
  }

  getManifestHookMetrics(): ManifestHookMetrics {
    return this.manifestHooks.getMetrics();
  }

  getPluginMetadata(): readonly ResolvedPluginMetadata[] {
    return getResolvedPluginMetadata(this.plugins());
  }

  getPluginInventory(): readonly ResolvedPluginMetadata[] {
    const resolved = this.plugins();
    const resolvedNames = new Set(resolved.map((plugin) => plugin.name));
    const configured =
      this.pipelineOptions.config?.pluginInventory ??
      (this.pipelineOptions.plugins ?? [])
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

  getPluginHookExecutions(): readonly PluginHookExecution[] {
    return [...this.hookExecutions];
  }

  getNoChangeFastPathBlockReason(
    previousCache: readonly ManifestHookCacheEntry[],
    pipelineFingerprint: string | undefined,
  ): string | undefined {
    return this.manifestHooks.getNoChangeFastPathBlockReason(
      previousCache,
      pipelineFingerprint,
    );
  }

  getManifestHookCache(): readonly ManifestHookCacheEntry[] {
    return this.manifestHooks.getCache();
  }

  /**
   * Starts the plugin build lifecycle exactly once, regardless of which public
   * entry point (content processing or location resolution) reaches it first.
   * Concurrent callers await the same run, so the ordered hooks
   * (`setup` → `buildStart` → `onConfigResolved`) are never
   * duplicated and no caller proceeds before the lifecycle completes.
   */
  startBuild(contentIndex: Map<string, string>): Promise<void> {
    this.buildLifecycle ??= this.runBuildLifecycle(contentIndex);
    return this.buildLifecycle;
  }

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

  async resolveExternalDependencies(
    contentIndex: Map<string, string>,
  ): Promise<{
    readonly snapshots: readonly ExternalDependencySnapshot[];
    readonly failures: readonly ExternalDependencyFailure[];
  }> {
    if (this.externalDependenciesResolved) {
      return {
        snapshots: [...this.externalDependencies.values()],
        failures: this.externalDependencyFailures,
      };
    }
    await this.startBuild(contentIndex);
    const snapshots = new Map<string, ExternalDependencySnapshot>();
    const failures: ExternalDependencyFailure[] = [];
    for (const plugin of this.plugins()) {
      const resolve = plugin.resolveExternalDependencies;
      if (!resolve) continue;
      const results = await this.observeHook(
        plugin,
        "resolveExternalDependencies",
        async () =>
          resolve({
            config: this.pipelineOptions.config,
            contentIndex,
            cache: this.cacheFor(plugin),
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
    this.externalDependencies = snapshots;
    this.externalDependencyFailures = failures;
    this.externalDependenciesResolved = true;
    return { snapshots: [...snapshots.values()], failures };
  }

  async resolveContentLocations(
    entries: readonly ContentLocationInput[],
    contentIndex: Map<string, string>,
  ): Promise<readonly ContentPublicLocation[]> {
    const context = { ...this.createContext(contentIndex), entries };
    const locations: ContentPublicLocation[] = [];
    for (const plugin of this.plugins()) {
      const resolver: PluginContentLocationResolver | undefined =
        plugin.resolveContentLocations;
      if (!resolver) continue;
      const pluginContext = this.createPluginContext(plugin, context);
      const resolved = await this.observeHook(
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

  canUseDevelopmentRouteManifest(): boolean {
    return this.plugins().every((plugin) => {
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

  async runDevelopmentRouteGraphHook(
    entries: ContentManifestEntry[],
    contentIndex: Map<string, string>,
  ): Promise<void> {
    const plugins = this.plugins().filter(
      (plugin) => plugin.developmentRouteManifest === true,
    );
    await this.runHook(
      "extendContentGraph",
      (plugin) => plugin.extendContentGraph,
      { ...this.createContext(contentIndex), entries },
      plugins,
    );
  }

  async runDevelopmentRouteManifestHook(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<void> {
    const plugins = this.plugins().filter(
      (plugin) => plugin.developmentRouteManifest === true,
    );
    await this.runHook(
      "onManifestCreated",
      (plugin) => plugin.onManifestCreated,
      { ...this.createContext(contentIndex), manifest },
      plugins,
    );
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

  async runAssetTransforms(manifest: ContentManifest): Promise<void> {
    const source = this.pipelineOptions.contentSource;
    if (!source) return;

    const referencedBy = new Map<string, ContentManifestEntry[]>();
    for (const entry of manifest.publicEntries) {
      for (const asset of entry.assets) {
        const entries = referencedBy.get(asset.path) ?? [];
        entries.push(entry);
        referencedBy.set(asset.path, entries);
      }
    }
    if (referencedBy.size === 0) return;

    const sourceEntries = new Map(
      (await source.scan()).map((entry) => [entry.path, entry]),
    );
    const assets = [...referencedBy.keys()]
      .sort()
      .map((path) => ({ path, size: sourceEntries.get(path)?.metadata?.size }));
    const readAsset = async (path: string): Promise<Uint8Array | null> => {
      if (!referencedBy.has(path)) {
        throw new Error(
          `Asset transform cannot read non-public asset: "${path}".`,
        );
      }
      const entry =
        sourceEntries.get(path) ?? (await getContentSourceEntry(source, path));
      if (!entry) return null;
      const content = await source.read(entry);
      return typeof content === "string" ? null : content;
    };

    for (const plugin of this.plugins()) {
      if (!plugin.transformAssets) continue;
      const outputs = await this.observeHook(
        plugin,
        "transformAssets",
        async () =>
          plugin.transformAssets?.({
            assets,
            readAsset,
            cache: this.cacheFor(plugin),
            logger: this.observability().logger.child({ plugin: plugin.name }),
            tracer: this.observability().tracer,
          }) ?? [],
      );
      this.registerAssetTransforms(plugin, outputs, referencedBy);
    }
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

  async runGeneratedOutputPlans(manifest: ContentManifest): Promise<void> {
    const plugins = this.plugins().filter(
      (plugin) => plugin.planGeneratedOutputs !== undefined,
    );
    if (plugins.length === 0) return;
    this.derivedOutputLinks.clear();
    this.derivedManifest = manifest;
    await this.refreshDerivedFiles();
    try {
      for (const plugin of plugins) {
        const hook = plugin.planGeneratedOutputs;
        if (!hook) continue;
        const outputs = await this.observeHook(
          plugin,
          "planGeneratedOutputs",
          async () =>
            hook(
              freezeGeneratedOutputPlanContext({
                manifest: {
                  discoverableEntries: manifest.discoverableEntries,
                  routableEntries: manifest.publicEntries,
                },
                site: this.pipelineOptions.config?.site,
                derived: this.derivedViews,
              }),
            ),
        );
        const sink = this.generatedOutputs.sinkFor(plugin.name);
        for (const output of outputs) {
          const viewIds = [...new Set(output.derivedViewIds ?? [])];
          const viewDependencies = viewIds.map((id) => {
            const version = this.derivedViews.versionOf(id);
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
          sink.emit({
            ...output,
            dependencies,
            ...(viewIds.length === 0 ? {} : { derivedViewIds: viewIds }),
          });
          for (const viewId of viewIds) {
            const paths = this.derivedOutputLinks.get(viewId) ?? new Set();
            paths.add(output.path);
            this.derivedOutputLinks.set(viewId, paths);
          }
        }
      }
    } finally {
      this.derivedManifest = null;
      this.derivedFiles = new Map();
    }
  }

  enableBuildTime(): void {
    this.isBuildTime = true;
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

  /**
   * Returns browser entries with only explicitly registered public
   * configuration. Validation occurs here as well as in integrations so a
   * manifest can safely be serialized by a future static HTML host.
   */
  collectClientEntries(): PluginClientEntry[] {
    return this.plugins().flatMap((plugin) =>
      (plugin.clientEntries ?? []).map((entry) => {
        if (entry.publicConfig !== undefined) {
          serializePublicClientConfig(entry.publicConfig);
        }
        return entry;
      }),
    );
  }

  /** Returns registered outputs sorted by path for a deterministic build. */
  collectGeneratedOutputs(): GeneratedOutput[] {
    return this.generatedOutputs.all();
  }

  emitCoreAsset(path: string, content: GeneratedOutputContent): void {
    this.generatedOutputs.sinkFor("core").emitAsset({
      path,
      content,
      dependencies: [{ type: "file", path }],
    });
  }

  private registerAssetTransforms(
    plugin: RiebeckitePlugin,
    outputs: readonly AssetTransformOutput[],
    referencedBy: ReadonlyMap<string, readonly ContentManifestEntry[]>,
  ): void {
    const sink = this.generatedOutputSinkFor(plugin);
    for (const output of outputs) {
      const entries = referencedBy.get(output.sourcePath);
      if (!entries) {
        throw new Error(
          `Asset transform from "${plugin.name}" emitted output for non-public asset: "${output.sourcePath}".`,
        );
      }
      sink.emitAsset({
        path: output.path,
        content: output.content,
        dependencies: [
          { type: "file", path: output.sourcePath },
          ...(output.dependencies ?? []),
        ],
      });
      const asset: ContentAsset = {
        path: output.path,
        sourcePath: output.sourcePath,
        mimeType: output.mimeType,
        width: output.width,
        height: output.height,
        size: output.content.byteLength,
      };
      for (const entry of entries) entry.assets.push(asset);
    }
  }

  async resolvePage(
    pathname: string,
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<ResolvedPluginPage | null> {
    return await this.pageResolver.resolvePage(
      pathname,
      manifest,
      contentIndex,
    );
  }

  async resolveRoute(
    pathname: string,
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<ResolvedPluginPage | null | undefined> {
    return await this.pageResolver.resolveRoute(
      pathname,
      manifest,
      contentIndex,
    );
  }

  async getPagePaths(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<readonly string[]> {
    return await this.pageResolver.getPagePaths(manifest, contentIndex);
  }

  async getPageRoutes(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<readonly PluginPageRoute[]> {
    return await this.pageResolver.getPageRoutes(manifest, contentIndex);
  }

  async getPageOutputs(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<readonly OutputDescriptor[]> {
    return await this.pageResolver.getPageOutputs(manifest, contentIndex);
  }

  getContentOutputDependencies(): ContentOutputDependencyResolver {
    const plugins = this.plugins();
    return ({ entry, manifest }) =>
      plugins.flatMap((plugin) => [
        ...(plugin.contentOutputDependencies ?? []),
        ...(plugin.resolveContentOutputDependencies?.({ entry, manifest }) ??
          []),
      ]);
  }

  async collectDiagnostics(
    contentIndex: Map<string, string>,
  ): Promise<Diagnostic[]> {
    const tracer = this.observability().tracer;
    return await tracer.span("diagnostics.run", {}, async () => {
      const results: Diagnostic[] = [];
      const context = this.createContext(contentIndex);
      for (const plugin of this.plugins()) {
        const hook = plugin.addDiagnostics;
        const diagnostics = hook
          ? await this.observeHook(plugin, "addDiagnostics", () =>
              runPluginHook(
                plugin,
                "addDiagnostics",
                this.createPluginContext(plugin, context),
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

  private async runBuildLifecycle(
    contentIndex: Map<string, string>,
  ): Promise<void> {
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

  private createContext(contentIndex: Map<string, string>): PluginContextBase {
    this.contentIndex = contentIndex;
    return {
      config: this.pipelineOptions.config,
      isDevelopment: this.pipelineOptions.isDevelopment,
      contentIndex,
      contentSource: this.pipelineOptions.contentSource,
      diagnostics: this.diagnostics,
      externalDependencies: this.externalDependencies,
    };
  }

  private createPluginContext<TContext extends PluginContextBase>(
    plugin: RiebeckitePlugin,
    context: TContext,
  ): PluginContextWithCache<TContext> {
    const observability = this.observability();
    return {
      ...context,
      cache: this.cacheFor(plugin),
      derived: this.derivedViews,
      output: this.generatedOutputSinkFor(plugin),
      logger: observability.logger.child({ plugin: plugin.name }),
      tracer: observability.tracer,
    };
  }

  private generatedOutputSinkFor(
    plugin: RiebeckitePlugin,
  ): GeneratedOutputSink {
    return this.generatedOutputs.sinkFor(plugin.name);
  }

  private cacheFor(plugin: RiebeckitePlugin): PluginCache {
    const cached = this.pluginCaches.get(plugin.name);
    if (cached) return cached;

    const cache = this.isBuildTime
      ? createPluginCache({
          pluginName: plugin.name,
          cacheVersion: plugin.cacheVersion,
          cacheDirectory: resolvePluginCacheDirectory(
            this.pipelineOptions.config,
          ),
          logger: this.observability().logger.child({ plugin: plugin.name }),
          tracer: this.observability().tracer,
        })
      : createUnavailablePluginCache();
    if (!this.isBuildTime) {
      this.observability().tracer.event("cache.bypass", {
        plugin: plugin.name,
      });
    }
    this.pluginCaches.set(plugin.name, cache);
    return cache;
  }

  private derivedCache(): PluginCache {
    if (!this.isBuildTime) return createUnavailablePluginCache();
    return createPluginCache({
      pluginName: "riebeckite-derived-data",
      cacheVersion: "3",
      cacheDirectory: resolvePluginCacheDirectory(this.pipelineOptions.config),
      logger: this.observability().logger.child({
        plugin: "riebeckite-derived-data",
      }),
      tracer: this.observability().tracer,
    });
  }

  private async refreshDerivedFiles(): Promise<void> {
    const source = this.pipelineOptions.contentSource;
    if (!source) {
      this.derivedFiles = new Map();
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
      this.derivedFiles = new Map(fingerprints);
    } catch {
      this.derivedFiles = new Map();
      this.observability().logger.warn(
        "Derived View file dependencies could not be refreshed.",
        { source: "derived-view" },
      );
      this.observability().tracer.event("derived-view.file-dependencies-miss", {
        source: "derived-view",
      });
    }
  }

  private async runHook<TContext extends PluginContextBase>(
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

  private async observeHook<T>(
    plugin: RiebeckitePlugin,
    hook: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const sequence = ++this.hookSequence;
    const startedAt = performance.now();
    try {
      const result = await operation();
      this.recordHookExecution(
        plugin,
        hook,
        "executed",
        performance.now() - startedAt,
        sequence,
      );
      return result;
    } catch (error) {
      this.recordHookExecution(
        plugin,
        hook,
        "failed",
        performance.now() - startedAt,
        sequence,
      );
      throw error;
    }
  }

  private recordHookExecution(
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

  private observability(): Observability {
    return this.pipelineOptions.observability ?? noopObservability;
  }

  private plugins() {
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

function assertUniqueDerivedViewIds(
  plugins: readonly RiebeckitePlugin[],
): void {
  const owners = new Map<string, string>();
  for (const plugin of plugins) {
    for (const view of plugin.derivedViews ?? []) {
      const previous = owners.get(view.id);
      if (previous) {
        throw new Error(
          `Derived View "${view.id}" is declared by both "${previous}" and "${plugin.name}".`,
        );
      }
      owners.set(view.id, plugin.name);
    }
  }
}

function freezeGeneratedOutputPlanContext(context: {
  manifest: {
    discoverableEntries: readonly ContentManifestEntry[];
    routableEntries: readonly ContentManifestEntry[];
  };
  site: ResolvedRiebeckiteConfig["site"] | undefined;
  derived: DerivedViewRegistry;
}) {
  return {
    ...deepFreeze(
      structuredClone({ manifest: context.manifest, site: context.site }),
    ),
    derived: context.derived,
  };
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  Object.freeze(value);
  for (const property of Object.values(value)) deepFreeze(property);
  return value;
}

function normalizeDerivedPath(path: string): string {
  return path.replace(/\\/g, "/");
}

function fingerprintDerivedValue(value: unknown): string {
  return fingerprintExternalValue(normalizeDerivedValue(value));
}

function normalizeDerivedValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(normalizeDerivedValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        normalizeDerivedValue(child),
      ]),
    );
  }
  return value;
}

function countSeverity(
  diagnostics: readonly Diagnostic[],
  severity: Diagnostic["severity"],
): number {
  return diagnostics.filter((diagnostic) => diagnostic.severity === severity)
    .length;
}
