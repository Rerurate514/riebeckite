import type {
  DerivedDependency,
  DerivedView,
  DerivedViewRegistry,
} from "../derived/derived_view.js";
import { resolvePluginDependencies } from "../plugin/plugin_dependency.js";
import type { PluginOptionsValidator } from "./config_validation.js";
import type {
  ContentManifest,
  ContentManifestEntry,
} from "./content_manifest.js";
import type { Diagnostic } from "./diagnostic.js";
import type {
  ExternalDependencyContext,
  ExternalDependencyResolution,
} from "./external_dependency.js";
import type { GeneratedOutputContent } from "./generated_output.js";
import type { OutputDependency } from "./output_dependency.js";
import type { PluginAsset, PluginClientEntry } from "./plugin_asset.js";
import type {
  PluginContentContext,
  PluginContentLocationAugmentContext,
  PluginContentLocationResolver,
  PluginContentRenderer,
  PluginContext,
  PluginGeneratedHtmlInspector,
  PluginGraphContext,
  PluginLifecycleContext,
  PluginManifestContext,
  PluginPostContext,
} from "./plugin_context.js";
import type { PluginEndpoint } from "./plugin_endpoint.js";
import type { PluginPageType } from "./plugin_page.js";
import type {
  HtmlPipeline,
  MarkdownPipeline,
  MarkdownPipelineContext,
  PipelinePlugin,
} from "./plugin_pipeline.js";
import type { PluginSeoExtension } from "./plugin_seo.js";
import type { ResolvedRiebeckiteConfig } from "./resolved_riebeckite_config.js";

export type RiebeckitePlugin<TOptions = unknown> = {
  name: string;
  options?: TOptions;
  order?: number;
  enabled?: boolean;
  /**
   * Capabilities this plugin exposes to other plugins. A capability must have
   * exactly one enabled provider; duplicate providers fail resolution.
   */
  provides?: string[];
  /**
   * Capabilities this plugin depends on. Resolution orders each provider
   * before this plugin and fails with a diagnostic when none is available.
   */
  requires?: string[];
  /**
   * Capabilities this plugin uses when available. A missing capability is
   * ignored, while a present provider is still ordered before this plugin.
   */
  optional?: string[];
  cacheVersion?: string;
  derivedViews?: readonly DerivedView<unknown, unknown>[];
  contentFileMetadata?: boolean;
  developmentRouteManifest?: true;
  /**
   * Explicit contract for the persistent processed-content cache.
   *
   * This is intentionally separate from `cacheVersion`, which versions the
   * plugin-local cache storage. Content-transforming plugins without this
   * contract are treated as unsafe for persistent `PostContent` reuse.
   *
   * - `none`: processed HTML depends only on the current content source,
   *   frontmatter, plugin options, and this contract version.
   * - `tracked`: external content/file inputs are read only through
   *   framework-owned APIs that record dependency fingerprints.
   * - `global`: processed HTML depends on the resolved content-location set.
   * - `unsafe`: persistent processed-content cache must bypass this plugin.
   *
   * `appliesToContent` may narrow an unsafe contract to raw Markdown sources
   * it can affect. It must return `unknown` when it cannot prove the result;
   * unknown falls back to bypassing the cache. Content and environment
   * fingerprints must be stable whenever they are supplied.
   */
  processedContentCache?: {
    version: string;
    dependencyMode: "none" | "tracked" | "global" | "unsafe";
    appliesToContent?: (
      context: ProcessedContentCacheContext,
    ) => ProcessedContentCacheApplicability;
    contentDependencyFingerprint?: (
      context: ProcessedContentCacheContext,
    ) => string | undefined;
    environmentFingerprint?: () => string | undefined;
  };
  resolveExternalDependencies?(
    context: ExternalDependencyContext,
  ): Promise<readonly ExternalDependencyResolution[]>;
  validateOptions?: PluginOptionsValidator<TOptions>;
  remarkPlugins?: PipelinePlugin[];
  rehypePlugins?: PipelinePlugin[];
  setup?(context: PluginLifecycleContext): void | Promise<void>;
  buildStart?(context: PluginLifecycleContext): void | Promise<void>;
  buildEnd?(context: PluginManifestContext): void | Promise<void>;
  transformAssets?(
    context: PluginAssetTransformContext,
  ): readonly AssetTransformOutput[] | Promise<readonly AssetTransformOutput[]>;
  planGeneratedOutputs?(
    context: PluginGeneratedOutputPlanContext,
  ):
    | readonly PlannedGeneratedOutput[]
    | Promise<readonly PlannedGeneratedOutput[]>;
  dispose?(context: PluginLifecycleContext): void | Promise<void>;
  onConfigResolved?(context: PluginContext): void | Promise<void>;
  onContentLoaded?(context: PluginContentContext): void | Promise<void>;
  resolveContentLocations?: PluginContentLocationResolver;
  extendContentLocations?(
    context: PluginContentLocationAugmentContext,
  ): void | Promise<void>;
  onPostParsed?(context: PluginPostContext): void | Promise<void>;
  onPostProcessed?(context: PluginPostContext): void | Promise<void>;
  manifestHookCache?: { version: string };
  onManifestCreated?(context: PluginManifestContext): void | Promise<void>;
  extendMarkdownPipeline?(
    pipeline: MarkdownPipeline,
    context: MarkdownPipelineContext,
  ): void;
  extendHtmlPipeline?(pipeline: HtmlPipeline): void;
  addDiagnostics?(context: PluginContext): Diagnostic[] | Promise<Diagnostic[]>;
  /**
   * Inspects final HTML pages after the SSG stage. Integrations that finish HTML
   * generation call this for every emitted `.html` file. Prefer `addDiagnostics`
   * for article-body rules; use this when the rule needs the whole document.
   */
  inspectGeneratedHtml?: PluginGeneratedHtmlInspector;
  assets?: PluginAsset[];
  clientEntries?: PluginClientEntry[];
  endpoints?: PluginEndpoint[];
  seo?: PluginSeoExtension;
  extendContentGraph?(context: PluginGraphContext): void | Promise<void>;
  renderers?: PluginContentRenderer[];
  contentOutputDependencies?: readonly OutputDependency[];
  resolveContentOutputDependencies?: ContentOutputDependencyResolver;
  /** Framework-independent page types contributed by this plugin. */
  pageTypes?: PluginPageType[];
};

export type ContentOutputDependencyResolver = (context: {
  readonly entry: ContentManifestEntry;
  readonly manifest: ContentManifest;
}) => readonly OutputDependency[];

export type PlannedGeneratedOutput = {
  readonly path: string;
  readonly content: GeneratedOutputContent;
  readonly dependencies?: readonly OutputDependency[];
  readonly derivedDependencies?: readonly DerivedDependency[];
  readonly derivedViewIds?: readonly string[];
};

export type PluginGeneratedOutputPlanContext = {
  readonly manifest: Readonly<{
    readonly discoverableEntries: readonly ContentManifestEntry[];
    readonly routableEntries: readonly ContentManifestEntry[];
  }>;
  readonly site: Readonly<ResolvedRiebeckiteConfig["site"]> | undefined;
  readonly derived: DerivedViewRegistry;
};

export type AssetTransformInput = {
  readonly path: string;
  readonly size?: number;
};

export type AssetTransformOutput = {
  readonly sourcePath: string;
  readonly path: string;
  readonly content: Uint8Array;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
  readonly dependencies?: readonly OutputDependency[];
};

export type PluginAssetTransformContext = {
  readonly assets: readonly AssetTransformInput[];
  readonly readAsset: (path: string) => Promise<Uint8Array | null>;
  readonly cache: import("../plugin/plugin_cache.js").PluginCache;
  readonly logger: import("../observability.js").Logger;
  readonly tracer: import("../observability.js").Tracer;
};

export type ProcessedContentCacheContext = {
  readonly slug: string;
  readonly source: string;
};

export type ProcessedContentCacheApplicability =
  | "applies"
  | "does-not-apply"
  | "unknown";

export type PluginInput = RiebeckitePlugin | false | null | undefined;

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

  assertUniquePluginNames(orderedPlugins);

  return resolvePluginDependencies(orderedPlugins);
}

/**
 * `plugin.name` is the ownership key for the plugin cache and the generated
 * output registry, so two enabled plugins sharing a name silently collide
 * there. `validateConfig` already reports this for config-driven plugins; this
 * guard covers direct `resolvePlugins` callers such as the pipeline and the
 * plugin runtime.
 */
function assertUniquePluginNames(plugins: readonly RiebeckitePlugin[]): void {
  const owners = new Map<string, number>();
  plugins.forEach((plugin, index) => {
    const previous = owners.get(plugin.name);
    if (previous !== undefined) {
      throw new Error(
        `Plugin name "${plugin.name}" is used by both plugins[${previous}] and plugins[${index}]`,
      );
    }
    owners.set(plugin.name, index);
  });
}

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
