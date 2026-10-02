import type { OutputDescriptor } from "../content/output_dependency.js";
import type { Observability } from "../observability.js";
import { noopObservability } from "../observability.js";
import type { PipelineOptions } from "../pipeline.js";
import type {
  ContentLocationInput,
  ContentManifest,
  ContentManifestEntry,
  ContentPublicLocation,
} from "../types/content_manifest.js";
import type { Diagnostic } from "../types/diagnostic.js";
import type {
  GeneratedOutput,
  GeneratedOutputSink,
} from "../types/generated_output.js";
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
import { GeneratedOutputRegistry } from "./generated_output_registry.js";
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
  runSetup,
} from "./plugin_lifecycle.js";

type PluginContextBase = Omit<
  PluginContext,
  "cache" | "logger" | "tracer" | "output"
>;
type PluginContextWithCache<TContext extends PluginContextBase> = TContext &
  Pick<PluginContext, "cache" | "logger" | "tracer" | "output">;

/**
 * Explicit build lifecycle stages. `idle` means no build lifecycle has been
 * requested yet; the remaining values name the stage currently executing.
 * Once `started` is reached the lifecycle never runs again.
 */
export type PluginBuildStage =
  | "idle"
  | "setup"
  | "buildStart"
  | "onBuildStart"
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

  constructor(private pipelineOptions: PipelineOptions = {}) {}

  getDiagnostics(): Diagnostic[] {
    return this.diagnostics;
  }

  getBuildStage(): PluginBuildStage {
    return this.buildStage;
  }

  /**
   * Starts the plugin build lifecycle exactly once, regardless of which public
   * entry point (content processing or location resolution) reaches it first.
   * Concurrent callers await the same run, so the ordered hooks
   * (`setup` → `buildStart` → `onBuildStart` → `onConfigResolved`) are never
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
    await this.runHook((plugin) => plugin.onContentLoaded, {
      ...this.createContext(contentIndex),
      slug,
      markdown,
    });
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
      const resolved = await resolver(
        this.createPluginContext(plugin, context),
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
    await this.runHook((plugin) => plugin.extendContentLocations, {
      ...this.createContext(contentIndex),
      entries,
      locations,
    });
  }

  async runPostHook(
    hookName: "onPostParsed" | "onPostProcessed",
    slug: string,
    markdown: string,
    content: PostContent,
    contentIndex: Map<string, string>,
  ) {
    await this.runHook((plugin) => plugin[hookName], {
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
    await this.runHook((plugin) => plugin.extendContentGraph, {
      ...this.createContext(contentIndex),
      entries,
    });
  }

  async runManifestCreated(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ) {
    await this.runHook((plugin) => plugin.onManifestCreated, {
      ...this.createContext(contentIndex),
      manifest,
    });
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
    await this.runHook((plugin) => plugin.onBuildEnd, {
      ...this.createContext(contentIndex),
      manifest,
    });
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

  async resolvePage(
    pathname: string,
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<ResolvedPluginPage | null> {
    const matches: { page: ResolvedPluginPage; priority: number }[] = [];
    const normalizedPathname = normalizePagePath(pathname);
    const context = {
      ...this.createContext(contentIndex),
      manifest,
      pathname: normalizedPathname,
    };
    for (const plugin of this.plugins()) {
      for (const pageType of plugin.pageTypes ?? []) {
        const page = await pageType.resolve(
          this.createPluginContext(plugin, context),
        );
        if (page) {
          matches.push({
            page: { ...page, type: pageType.id, pluginName: plugin.name },
            priority: pageType.priority ?? 0,
          });
        }
      }
    }
    if (matches.length === 0) return null;
    const highestPriority = Math.max(...matches.map((match) => match.priority));
    const highest = matches.filter(
      (match) => match.priority === highestPriority,
    );
    if (highest.length !== 1) {
      throw new Error(
        `Multiple plugin page types match ${normalizedPathname} at priority ${highestPriority}: ${highest
          .map((match) => match.page.type)
          .join(", ")}`,
      );
    }
    return highest[0].page;
  }

  async getPagePaths(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<readonly string[]> {
    const paths: string[] = [];
    const context = { ...this.createContext(contentIndex), manifest };
    for (const plugin of this.plugins()) {
      for (const pageType of plugin.pageTypes ?? []) {
        const declared = pageType.paths;
        if (!declared) continue;
        paths.push(
          ...(typeof declared === "function"
            ? await declared(this.createPluginContext(plugin, context))
            : declared),
        );
      }
    }
    return [...new Set(paths.map(normalizePagePath))];
  }

  async getPageOutputs(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<readonly OutputDescriptor[]> {
    const outputs: OutputDescriptor[] = [];
    const context = { ...this.createContext(contentIndex), manifest };
    for (const plugin of this.plugins()) {
      for (const pageType of plugin.pageTypes ?? []) {
        const declared = pageType.paths;
        if (!declared) continue;
        const paths =
          typeof declared === "function"
            ? await declared(this.createPluginContext(plugin, context))
            : declared;
        for (const rawPath of paths) {
          const pathname = normalizePagePath(rawPath);
          const dependencyContext = { ...context, pathname };
          const dependencies = pageType.outputDependencies
            ? typeof pageType.outputDependencies === "function"
              ? await pageType.outputDependencies(
                  this.createPluginContext(plugin, dependencyContext),
                )
              : pageType.outputDependencies
            : [{ type: "unknown" as const }];
          outputs.push({
            kind: "plugin-page",
            path: pathname,
            producer: `plugin:${plugin.name}:page:${pageType.id}`,
            dependencies,
          });
        }
      }
    }
    return uniqueOutputs(outputs);
  }

  async collectDiagnostics(
    contentIndex: Map<string, string>,
  ): Promise<Diagnostic[]> {
    const tracer = this.observability().tracer;
    return await tracer.span("diagnostics.run", {}, async () => {
      const results: Diagnostic[] = [];
      const context = this.createContext(contentIndex);
      for (const plugin of this.plugins()) {
        const diagnostics = await plugin.addDiagnostics?.(
          this.createPluginContext(plugin, context),
        );
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
        stage: "onBuildStart",
        run: () => this.runHook((plugin) => plugin.onBuildStart, context),
      },
      {
        stage: "onConfigResolved",
        run: () => this.runHook((plugin) => plugin.onConfigResolved, context),
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
      await pluginContext.tracer.span(
        "plugin.hook",
        {
          plugin: plugin.name,
        },
        () => pluginHook(pluginContext),
      );
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

function collectPageTypeOwners(plugins: readonly RiebeckitePlugin[]): void {
  const pageTypes = new Map<string, string>();
  for (const plugin of plugins) {
    const declaredPageTypes = plugin.pageTypes;
    if (declaredPageTypes !== undefined && !Array.isArray(declaredPageTypes)) {
      throw new TypeError(`Plugin ${plugin.name} pageTypes must be an array`);
    }
    for (const pageType of declaredPageTypes ?? []) {
      validatePageType(plugin.name, pageType);
      const previous = pageTypes.get(pageType.id);
      if (previous) {
        throw new Error(
          `Plugin page type "${pageType.id}" is provided by both ${previous} and ${plugin.name}`,
        );
      }
      pageTypes.set(pageType.id, plugin.name);
    }
  }
}

function validatePageType(pluginName: string, pageType: unknown): void {
  if (typeof pageType !== "object" || pageType === null) {
    throw new TypeError(`Plugin ${pluginName} pageTypes must contain objects`);
  }
  const candidate = pageType as {
    id?: unknown;
    resolve?: unknown;
    paths?: unknown;
    priority?: unknown;
    outputDependencies?: unknown;
  };
  if (typeof candidate.id !== "string" || candidate.id.trim() === "") {
    throw new TypeError(
      `Plugin ${pluginName} page type id must be a non-empty string`,
    );
  }
  if (typeof candidate.resolve !== "function") {
    throw new TypeError(
      `Plugin ${pluginName} page type "${candidate.id}" must provide a resolve function`,
    );
  }
  if (
    candidate.paths !== undefined &&
    !Array.isArray(candidate.paths) &&
    typeof candidate.paths !== "function"
  ) {
    throw new TypeError(
      `Plugin ${pluginName} page type "${candidate.id}" paths must be an array or function`,
    );
  }
  if (
    candidate.priority !== undefined &&
    (typeof candidate.priority !== "number" ||
      !Number.isFinite(candidate.priority))
  ) {
    throw new TypeError(
      `Plugin ${pluginName} page type "${candidate.id}" priority must be a finite number`,
    );
  }
  if (
    candidate.outputDependencies !== undefined &&
    !Array.isArray(candidate.outputDependencies) &&
    typeof candidate.outputDependencies !== "function"
  ) {
    throw new TypeError(
      `Plugin ${pluginName} page type "${candidate.id}" outputDependencies must be an array or function`,
    );
  }
}

function normalizePagePath(pathname: string): string {
  const path = `/${pathname.split("/").filter(Boolean).join("/")}`;
  return path === "/" ? path : path.replace(/\/$/, "");
}

function countSeverity(
  diagnostics: readonly Diagnostic[],
  severity: Diagnostic["severity"],
): number {
  return diagnostics.filter((diagnostic) => diagnostic.severity === severity)
    .length;
}

function uniqueOutputs(
  outputs: readonly OutputDescriptor[],
): readonly OutputDescriptor[] {
  const byPath = new Map<string, OutputDescriptor>();
  for (const output of outputs) byPath.set(output.path, output);
  return [...byPath.values()].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
}
