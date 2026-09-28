import { resolvePluginDependencies } from "../plugin/plugin_dependency.js";
import type { PluginOptionsValidator } from "./config_validation.js";
import type { Diagnostic } from "./diagnostic.js";
import type { PluginAsset, PluginClientEntry } from "./plugin_asset.js";
import type {
  PluginContentContext,
  PluginContentLocationAugmentContext,
  PluginContentLocationResolver,
  PluginContentRenderer,
  PluginContext,
  PluginGraphContext,
  PluginLifecycleContext,
  PluginManifestContext,
  PluginPostContext,
} from "./plugin_context.js";
import type { PluginEndpoint } from "./plugin_endpoint.js";
import type {
  HtmlPipeline,
  MarkdownPipeline,
  MarkdownPipelineContext,
  PipelinePlugin,
} from "./plugin_pipeline.js";
import type { PluginSeoExtension } from "./plugin_seo.js";

export type RiebeckitePlugin<TOptions = unknown> = {
  name: string;
  options?: TOptions;
  order?: number;
  enabled?: boolean;
  provides?: string[];
  requires?: string[];
  optional?: string[];
  cacheVersion?: string;
  validateOptions?: PluginOptionsValidator<TOptions>;
  remarkPlugins?: PipelinePlugin[];
  rehypePlugins?: PipelinePlugin[];
  setup?(context: PluginLifecycleContext): void | Promise<void>;
  buildStart?(context: PluginLifecycleContext): void | Promise<void>;
  buildEnd?(context: PluginManifestContext): void | Promise<void>;
  dispose?(context: PluginLifecycleContext): void | Promise<void>;
  onConfigResolved?(context: PluginContext): void | Promise<void>;
  onContentLoaded?(context: PluginContentContext): void | Promise<void>;
  resolveContentLocations?: PluginContentLocationResolver;
  extendContentLocations?(
    context: PluginContentLocationAugmentContext,
  ): void | Promise<void>;
  onPostParsed?(context: PluginPostContext): void | Promise<void>;
  onPostProcessed?(context: PluginPostContext): void | Promise<void>;
  onManifestCreated?(context: PluginManifestContext): void | Promise<void>;
  onBuildStart?(context: PluginContext): void | Promise<void>;
  onBuildEnd?(context: PluginManifestContext): void | Promise<void>;
  extendMarkdownPipeline?(
    pipeline: MarkdownPipeline,
    context: MarkdownPipelineContext,
  ): void;
  extendHtmlPipeline?(pipeline: HtmlPipeline): void;
  addDiagnostics?(context: PluginContext): Diagnostic[] | Promise<Diagnostic[]>;
  assets?: PluginAsset[];
  clientEntries?: PluginClientEntry[];
  endpoints?: PluginEndpoint[];
  seo?: PluginSeoExtension;
  extendContentGraph?(context: PluginGraphContext): void | Promise<void>;
  renderers?: PluginContentRenderer[];
};

export type PluginInput = RiebeckitePlugin | false | null | undefined;

/** Resolved plugin metadata that is safe to expose to tooling. */
export type ResolvedPluginMetadata = {
  readonly name: string;
  readonly enabled: boolean;
  readonly provides: readonly string[];
  readonly requires: readonly string[];
  readonly optional: readonly string[];
};

export function definePlugin<TOptions>(
  plugin: RiebeckitePlugin<TOptions>,
): RiebeckitePlugin<TOptions> {
  return plugin;
}

export function resolvePlugins(
  plugins: PluginInput[] = [],
): RiebeckitePlugin[] {
  const orderedPlugins = plugins
    .filter((plugin): plugin is RiebeckitePlugin => Boolean(plugin))
    .filter((plugin) => plugin.enabled !== false)
    .toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return resolvePluginDependencies(orderedPlugins);
}

/**
 * Returns metadata for plugins in their resolved execution order.
 * Plugin options and lifecycle implementations are deliberately excluded.
 */
export function getResolvedPluginMetadata(
  plugins: readonly RiebeckitePlugin[],
): readonly ResolvedPluginMetadata[] {
  return plugins.map((plugin) => ({
    name: plugin.name,
    enabled: plugin.enabled !== false,
    provides: plugin.provides ?? [],
    requires: plugin.requires ?? [],
    optional: plugin.optional ?? [],
  }));
}
