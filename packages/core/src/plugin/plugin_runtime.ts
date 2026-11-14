import type { ManifestHookCacheEntry } from "../content/content_build_state.js";
import type {
  DerivedViewExecution,
  DerivedViewRegistry,
} from "../derived/derived_view.js";
import type { PipelineOptions } from "../pipeline.js";
import type {
  ContentLocationInput,
  ContentManifest,
  ContentManifestEntry,
  ContentPublicLocation,
} from "../types/content_manifest.js";
import type { RiebeckitePlugin } from "../types/plugin.js";
import { resolvePlugins } from "../types/plugin.js";
import type { PostContent } from "../types/post_content.js";
import type { ManifestHookRunner } from "./manifest_hooks.js";
import { runDispose, runPluginHook } from "./plugin_lifecycle.js";
import { collectPageTypeOwners } from "./plugin_pages.js";
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

import { PluginRuntimeMethodsE } from "./plugin_runtime_methods_e.js";
import { assertUniqueDerivedViewIds } from "./plugin_runtime_shared.js";
import { initializePluginRuntime } from "./plugin_runtime_state.js";
import { asPluginRuntimeContext } from "./plugin_runtime_state_types.js";

export class PluginRuntime extends PluginRuntimeMethodsE {
  private pipelineOptions!: PipelineOptions;
  private buildLifecycle!: Promise<void> | null;
  private disposed!: boolean;
  private readonly derivedViews!: DerivedViewRegistry;
  private resolvedPlugins!: RiebeckitePlugin[] | null;
  private readonly manifestHooks!: ManifestHookRunner;
  private hookSequence!: number;
  private hookExecutions!: PluginHookExecution[];

  constructor(pipelineOptions: PipelineOptions = {}) {
    super();
    initializePluginRuntime(asPluginRuntimeContext(this), pipelineOptions);
  }

  getMarkdownComponents() {
    return this.plugins().flatMap((plugin) => plugin.markdownComponents ?? []);
  }

  getHastTransforms() {
    return this.plugins().flatMap((plugin) => plugin.hastTransforms ?? []);
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
