import type { ManifestHookCacheEntry } from "../content/content_build_state.js";
import type { OutputDescriptor } from "../content/output_dependency.js";
import type { Observability } from "../observability.js";
import { noopObservability } from "../observability.js";
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
import type { OutputDependency } from "../types/output_dependency.js";
import type { RiebeckitePlugin } from "../types/plugin.js";
import { resolvePlugins } from "../types/plugin.js";
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
import {
  runBuildEnd,
  runBuildStart,
  runDispose,
  runPluginHook,
  runSetup,
} from "./plugin_lifecycle.js";
import { collectPageTypeOwners, PluginPageResolver } from "./plugin_pages.js";
import type {
  PluginContextBase,
  PluginContextWithCache,
} from "./plugin_runtime_context.js";

export type {
  ManifestHookMetrics,
  ManifestHookPluginMetrics,
} from "./manifest_hooks.js";

/**
 * Explicit build lifecycle stages. `idle` means no build lifecycle has been
 * requested yet; the remaining values name the stage currently executing.
 * Once `started` is reached the lifecycle never runs again.
 */
export type PluginBuildStage =
  | "idle"
  | "setup"
  | "buildStart"
  | "onConfigResolved"
  | "started";

export class PluginRuntime {
  private buildLifecycle: Promise<void> | null = null;
  private buildStage: PluginBuildStage = "idle";
  private disposed = false;
  private diagnostics: PluginContext["diagnostics"] = [];
  private pluginCaches = new Map<string, PluginCache>();
  private generatedOutputs = new GeneratedOutputRegistry();
  private isBuildTime = false;
  private resolvedPlugins: RiebeckitePlugin[] | null = null;
  private externalDependencies = new Map<string, ExternalDependencySnapshot>();
  private externalDependencyFailures: ExternalDependencyFailure[] = [];
  private externalDependenciesResolved = false;
  private readonly pageResolver: PluginPageResolver;
  private readonly manifestHooks: ManifestHookRunner;

  constructor(private pipelineOptions: PipelineOptions = {}) {
    this.pageResolver = new PluginPageResolver({
      plugins: () => this.plugins(),
      createContext: (contentIndex) => this.createContext(contentIndex),
      createPluginContext: (plugin, context) =>
        this.createPluginContext(plugin, context),
    });
    this.manifestHooks = new ManifestHookRunner({
      plugins: () => this.plugins(),
      createContext: (contentIndex) => this.createContext(contentIndex),
      createPluginContext: (plugin, context) =>
        this.createPluginContext(plugin, context),
      generatedOutputCount: () => this.generatedOutputs.count(),
      diagnosticCount: () => this.diagnostics.length,
    });
  }

  getDiagnostics(): Diagnostic[] {
    return this.diagnostics;
  }

  getBuildStage(): PluginBuildStage {
    return this.buildStage;
  }

  getManifestHookMetrics(): ManifestHookMetrics {
    return this.manifestHooks.getMetrics();
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
      const results = await resolve({
        config: this.pipelineOptions.config,
        contentIndex,
        cache: this.cacheFor(plugin),
      });
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
      const resolved = await runPluginHook(
        plugin,
        "resolveContentLocations",
        pluginContext,
        resolver,
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
    const context = {
      ...this.createContext(contentIndex),
      manifest,
    };
    await runBuildEnd(this.plugins(), (plugin) =>
      this.createPluginContext(plugin, context),
    );
  }

  async runGeneratedOutputPlans(manifest: ContentManifest): Promise<void> {
    for (const plugin of this.plugins()) {
      const hook = plugin.planGeneratedOutputs;
      if (!hook) continue;
      const outputs = await hook(
        freezeGeneratedOutputPlanContext({
          manifest: {
            discoverableEntries: manifest.discoverableEntries,
            routableEntries: manifest.publicEntries,
          },
          site: this.pipelineOptions.config?.site,
        }),
      );
      const sink = this.generatedOutputs.sinkFor(plugin.name);
      for (const output of outputs) {
        if (output.dependencies.length === 0) {
          throw new Error(
            `Generated output plan from "${plugin.name}" must declare at least one dependency.`,
          );
        }
        sink.emit(output);
      }
    }
  }

  enableBuildTime(): void {
    this.isBuildTime = true;
  }

  async dispose(contentIndex: Map<string, string>) {
    if (this.disposed || this.buildLifecycle === null) return;

    this.disposed = true;
    const context = this.createContext(contentIndex);
    await runDispose(this.plugins(), (plugin) =>
      this.createPluginContext(plugin, context),
    );
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

  getContentOutputDependencies(
    entry?: ContentManifestEntry,
  ): readonly OutputDependency[] {
    return this.plugins().flatMap((plugin) => [
      ...(plugin.contentOutputDependencies ?? []),
      ...(entry
        ? (plugin.resolveContentOutputDependencies?.(entry) ?? [])
        : []),
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
          ? await runPluginHook(
              plugin,
              "addDiagnostics",
              this.createPluginContext(plugin, context),
              hook,
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
    const createPluginContext = (plugin: RiebeckitePlugin) =>
      this.createPluginContext(plugin, context);
    const stages: readonly {
      readonly stage: PluginBuildStage;
      readonly run: () => Promise<void>;
    }[] = [
      {
        stage: "setup",
        run: () => runSetup(this.plugins(), createPluginContext),
      },
      {
        stage: "buildStart",
        run: () => runBuildStart(this.plugins(), createPluginContext),
      },
      {
        stage: "onConfigResolved",
        run: () =>
          this.runHook(
            "onConfigResolved",
            (plugin) => plugin.onConfigResolved,
            context,
          ),
      },
    ];

    for (const { stage, run } of stages) {
      this.buildStage = stage;
      await run();
    }
    this.buildStage = "started";
  }

  private createContext(contentIndex: Map<string, string>): PluginContextBase {
    return {
      config: this.pipelineOptions.config,
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
    this.pluginCaches.set(plugin.name, cache);
    return cache;
  }

  private async runHook<TContext extends PluginContextBase>(
    hookName: string,
    hook: (
      plugin: NonNullable<PipelineOptions["plugins"]>[number],
    ) =>
      | ((context: PluginContextWithCache<TContext>) => void | Promise<void>)
      | undefined,
    context: TContext,
  ) {
    for (const plugin of this.plugins()) {
      const pluginHook = hook(plugin);
      if (!pluginHook) continue;
      const pluginContext = this.createPluginContext(plugin, context);
      await runPluginHook(plugin, hookName, pluginContext, pluginHook);
    }
  }

  private observability(): Observability {
    return this.pipelineOptions.observability ?? noopObservability;
  }

  private plugins() {
    if (this.resolvedPlugins === null) {
      const resolved = resolvePlugins(this.pipelineOptions.plugins);
      collectPageTypeOwners(resolved);
      this.resolvedPlugins = resolved;
    }
    return this.resolvedPlugins;
  }
}

function freezeGeneratedOutputPlanContext(context: {
  manifest: {
    discoverableEntries: readonly ContentManifestEntry[];
    routableEntries: readonly ContentManifestEntry[];
  };
  site: ResolvedRiebeckiteConfig["site"] | undefined;
}) {
  return deepFreeze(structuredClone(context));
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  Object.freeze(value);
  for (const property of Object.values(value)) deepFreeze(property);
  return value;
}

function countSeverity(
  diagnostics: readonly Diagnostic[],
  severity: Diagnostic["severity"],
): number {
  return diagnostics.filter((diagnostic) => diagnostic.severity === severity)
    .length;
}
