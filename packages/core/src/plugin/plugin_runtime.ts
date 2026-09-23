import type { PipelineOptions } from "../pipeline";
import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest";
import type { Diagnostic } from "../types/diagnostic";
import { resolvePlugins } from "../types/plugin";
import type { PluginContext } from "../types/plugin_context";
import type { PostContent } from "../types/post_content";

export class PluginRuntime {
  private buildStarted = false;
  private diagnostics: PluginContext["diagnostics"] = [];

  constructor(private pipelineOptions: PipelineOptions = {}) {}

  getDiagnostics(): Diagnostic[] {
    return this.diagnostics;
  }

  async startBuild(contentIndex: Map<string, string>) {
    if (this.buildStarted) return;

    this.buildStarted = true;
    const context = this.createContext(contentIndex);
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
    await this.runHook((plugin) => plugin.onBuildEnd, {
      ...this.createContext(contentIndex),
      manifest,
    });
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
      const diagnostics = await plugin.addDiagnostics?.(context);
      for (const diagnostic of diagnostics ?? []) {
        results.push({
          ...diagnostic,
          pluginName: diagnostic.pluginName || plugin.name,
        });
      }
    }
    return results;
  }

  private createContext(contentIndex: Map<string, string>): PluginContext {
    return {
      config: this.pipelineOptions.config,
      contentIndex,
      diagnostics: this.diagnostics,
    };
  }

  private async runHook<TContext>(
    hook: (
      plugin: NonNullable<PipelineOptions["plugins"]>[number],
    ) => ((context: TContext) => void | Promise<void>) | undefined,
    context: TContext,
  ) {
    for (const plugin of this.plugins()) {
      await hook(plugin)?.(context);
    }
  }

  private plugins() {
    return resolvePlugins(this.pipelineOptions.plugins);
  }
}
