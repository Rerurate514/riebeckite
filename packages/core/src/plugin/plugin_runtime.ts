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
import type { RiebeckitePlugin } from "../types/plugin.js";
import { resolvePlugins } from "../types/plugin.js";
import type {
  PluginContentLocationResolver,
  PluginContext,
} from "../types/plugin_context.js";
import type { PostContent } from "../types/post_content.js";
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

type PluginContextBase = Omit<PluginContext, "cache" | "logger" | "tracer">;
type PluginContextWithCache<TContext extends PluginContextBase> = TContext &
  Pick<PluginContext, "cache" | "logger" | "tracer">;

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
  private isBuildTime = false;

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
      logger: observability.logger.child({ plugin: plugin.name }),
      tracer: observability.tracer,
    };
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
    return resolvePlugins(this.pipelineOptions.plugins);
  }
}

function countSeverity(
  diagnostics: readonly Diagnostic[],
  severity: Diagnostic["severity"],
): number {
  return diagnostics.filter((diagnostic) => diagnostic.severity === severity)
    .length;
}
