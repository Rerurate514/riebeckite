import type { ManifestHookCacheEntry } from "../content/content_build_state.js";
import type { OutputDescriptor } from "../content/output_dependency.js";
import type { DerivedViewRegistry } from "../derived/derived_view.js";
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
import type {
  AssetTransformOutput,
  ContentOutputDependencyResolver,
  ResolvedPluginMetadata,
  RiebeckitePlugin,
} from "../types/plugin.js";
import type { PluginClientEntry } from "../types/plugin_asset.js";
import type { PluginContext } from "../types/plugin_context.js";
import type { InspectorTabSnapshot } from "../types/plugin_inspector.js";
import type { ResolvedPluginPage } from "../types/plugin_page.js";
import type { PostContent } from "../types/post_content.js";
import type { GeneratedOutputRegistry } from "./generated_output_registry.js";
import type {
  ManifestHookMetrics,
  ManifestHookRunner,
} from "./manifest_hooks.js";
import type { PluginCache } from "./plugin_cache.js";
import type { PluginPageResolver } from "./plugin_pages.js";
import type {
  DerivedViewInspection,
  PluginHookExecution,
} from "./plugin_runtime.js";
import type {
  PluginContextBase,
  PluginContextWithCache,
} from "./plugin_runtime_context.js";

export interface PluginRuntimeContext {
  pipelineOptions: PipelineOptions;
  buildLifecycle: Promise<void> | null;
  disposed: boolean;
  diagnostics: PluginContext["diagnostics"];
  pluginCaches: Map<string, PluginCache>;
  derivedViews: DerivedViewRegistry;
  contentIndex: Map<string, string>;
  generatedOutputs: GeneratedOutputRegistry;
  isBuildTime: boolean;
  resolvedPlugins: RiebeckitePlugin[] | null;
  externalDependencies: Map<string, ExternalDependencySnapshot>;
  externalDependencyFailures: ExternalDependencyFailure[];
  externalDependenciesResolved: boolean;
  derivedFiles: Map<string, string>;
  derivedManifest: ContentManifest | null;
  derivedOutputLinks: Map<string, Set<string>>;
  pageResolver: PluginPageResolver;
  manifestHooks: ManifestHookRunner;
  pageMarkdownRenderer: ((markdown: string) => Promise<string>) | null;
  hookSequence: number;
  hookExecutions: PluginHookExecution[];
  getDiagnostics(): Diagnostic[];
  getDerivedViews(): DerivedViewRegistry;
  getDerivedViewInspection(): readonly DerivedViewInspection[];
  setPageMarkdownRenderer(
    renderer: (markdown: string) => Promise<string>,
  ): void;
  getManifestHookMetrics(): ManifestHookMetrics;
  getPluginMetadata(): readonly ResolvedPluginMetadata[];
  getMarkdownComponents(): NonNullable<
    RiebeckitePlugin["markdownComponents"]
  >[number][];
  getHastTransforms(): NonNullable<
    RiebeckitePlugin["hastTransforms"]
  >[number][];
  getPluginInventory(): readonly ResolvedPluginMetadata[];
  getPluginHookExecutions(): readonly PluginHookExecution[];
  collectInspectorTabs(): Promise<readonly InspectorTabSnapshot[]>;
  getNoChangeFastPathBlockReason(
    previousCache: readonly ManifestHookCacheEntry[],
    pipelineFingerprint: string | undefined,
  ): string | undefined;
  getManifestHookCache(): readonly ManifestHookCacheEntry[];
  startBuild(contentIndex: Map<string, string>): Promise<void>;
  runContentLoaded(
    slug: string,
    markdown: string,
    contentIndex: Map<string, string>,
  ): Promise<void>;
  resolveExternalDependencies(contentIndex: Map<string, string>): Promise<{
    readonly snapshots: readonly ExternalDependencySnapshot[];
    readonly failures: readonly ExternalDependencyFailure[];
  }>;
  resolveContentLocations(
    entries: readonly ContentLocationInput[],
    contentIndex: Map<string, string>,
  ): Promise<readonly ContentPublicLocation[]>;
  extendContentLocations(
    entries: readonly ContentLocationInput[],
    locations: Map<string, ContentPublicLocation>,
    contentIndex: Map<string, string>,
  ): Promise<void>;
  runPostHook(
    hookName: "onPostParsed" | "onPostProcessed",
    slug: string,
    markdown: string,
    content: PostContent,
    contentIndex: Map<string, string>,
  ): Promise<void>;
  runGraphHook(
    entries: ContentManifestEntry[],
    contentIndex: Map<string, string>,
  ): Promise<void>;
  canUseDevelopmentRouteManifest(): boolean;
  runDevelopmentRouteGraphHook(
    entries: ContentManifestEntry[],
    contentIndex: Map<string, string>,
  ): Promise<void>;
  runDevelopmentRouteManifestHook(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<void>;
  runManifestCreated(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
    previousCache: readonly ManifestHookCacheEntry[] | undefined,
    pipelineFingerprint: string | undefined,
  ): Promise<void>;
  runAssetTransforms(manifest: ContentManifest): Promise<void>;
  runBuildEnd(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<void>;
  runGeneratedOutputPlans(manifest: ContentManifest): Promise<void>;
  enableBuildTime(): void;
  dispose(contentIndex: Map<string, string>): Promise<void>;
  collectAssets(): unknown[];
  collectClientEntries(): PluginClientEntry[];
  collectGeneratedOutputs(): GeneratedOutput[];
  emitCoreAsset(path: string, content: GeneratedOutputContent): void;
  registerAssetTransforms(
    plugin: RiebeckitePlugin,
    outputs: readonly AssetTransformOutput[],
    referencedBy: ReadonlyMap<string, readonly ContentManifestEntry[]>,
  ): void;
  resolvePage(
    pathname: string,
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<ResolvedPluginPage | null>;
  resolveRoute(
    pathname: string,
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<ResolvedPluginPage | null | undefined>;
  getPagePaths(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<readonly string[]>;
  resolveContentLocalization(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<ContentManifest["localization"] | undefined>;
  getPageRoutes(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<readonly PluginPageRoute[]>;
  getPageOutputs(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<readonly OutputDescriptor[]>;
  getContentOutputDependencies(): ContentOutputDependencyResolver;
  collectDiagnostics(contentIndex: Map<string, string>): Promise<Diagnostic[]>;
  runBuildLifecycle(contentIndex: Map<string, string>): Promise<void>;
  createContext(contentIndex: Map<string, string>): PluginContextBase;
  createPluginContext<TContext extends PluginContextBase>(
    plugin: RiebeckitePlugin,
    context: TContext,
  ): PluginContextWithCache<TContext>;
  generatedOutputSinkFor(plugin: RiebeckitePlugin): GeneratedOutputSink;
  cacheFor(plugin: RiebeckitePlugin): PluginCache;
  derivedCache(): PluginCache;
  refreshDerivedFiles(): Promise<void>;
  runHook<TContext extends PluginContextBase>(
    hookName: string,
    hook: (
      plugin: NonNullable<PipelineOptions["plugins"]>[number],
    ) =>
      | ((context: PluginContextWithCache<TContext>) => void | Promise<void>)
      | undefined,
    context: TContext,
    plugins?: readonly RiebeckitePlugin[],
  ): Promise<void>;
  observeHook<T>(
    plugin: RiebeckitePlugin,
    hook: string,
    operation: () => Promise<T>,
  ): Promise<T>;
  recordHookExecution(
    plugin: RiebeckitePlugin,
    hook: string,
    status: PluginHookExecution["status"],
    durationMs: number,
    sequence?: number,
  ): void;
  observability(): Observability;
  plugins(): RiebeckitePlugin[];
}

export function asPluginRuntimeContext<Self>(self: Self): PluginRuntimeContext {
  return self as PluginRuntimeContext;
}
