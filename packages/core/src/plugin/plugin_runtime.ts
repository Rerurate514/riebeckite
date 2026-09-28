import type { PipelineOptions } from "../pipeline";
import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest";
import type { Diagnostic } from "../types/diagnostic";
import { resolvePlugins } from "../types/plugin";
import type { RiebeckitePlugin } from "../types/plugin";
import type { PluginContext } from "../types/plugin_context";
import type { PostContent } from "../types/post_content";
import {
  runBuildEnd,
  runBuildStart,
  runDispose,
  runSetup,
} from "./plugin_lifecycle";
import {
  createPluginCache,
  resolvePluginCacheDirectory,
} from "./plugin_cache";
import type { PluginCache } from "./plugin_cache";

type PluginContextBase = Omit<PluginContext, "cache">;
type PluginContextWithCache<TContext extends PluginContextBase> = TContext &
  Pick<PluginContext, "cache">;

export class PluginRuntime {
  private buildStarted = false;
  private disposed = false;
  private diagnostics: PluginContext["diagnostics"] = [];
  private pluginCaches = new Map<string, PluginCache>();

  constructor(private pipelineOptions: PipelineOptions = {}) {}

  getDiagnostics(): Diagnostic[] {
    return this.diagnostics;
  }

  async startBuild(contentIndex: Map<string, string>) {
    if (this.buildStarted) return;

    this.buildStarted = true;
    const context = this.createContext(contentIndex);
    const createPluginContext = (plugin: RiebeckitePlugin) =>
      this.createPluginContext(plugin, context);
    await runSetup(this.plugins(), createPluginContext);
    await runBuildStart(this.plugins(), createPluginContext);
    await this.runHook((plugin) => plugin.onBuildStart, context);
    await this.runHook((plugin) => plugin.onConfigResolved, context);
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

  async dispose(contentIndex: Map<string, string>) {
    if (this.disposed || !this.buildStarted) return;

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
    return results;
  }

  private createContext(
    contentIndex: Map<string, string>,
  ): PluginContextBase {
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
    return { ...context, cache: this.cacheFor(plugin) };
  }

  private cacheFor(plugin: RiebeckitePlugin): PluginCache {
    const cached = this.pluginCaches.get(plugin.name);
    if (cached) return cached;

    const cache = createPluginCache({
      pluginName: plugin.name,
      cacheVersion: plugin.cacheVersion,
      cacheDirectory: resolvePluginCacheDirectory(this.pipelineOptions.config),
    });
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
      await hook(plugin)?.(this.createPluginContext(plugin, context));
    }
  }

  private plugins() {
    return resolvePlugins(this.pipelineOptions.plugins);
  }
}
