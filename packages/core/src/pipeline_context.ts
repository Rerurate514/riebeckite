import type { unified } from "unified";
import type {
  CachedContentDependency,
  ContentDependencyTracker,
} from "./content/content_dependency_tracker.js";
import type { PersistentContentCache } from "./content/content_persistent_cache.js";
import type { ContentSource } from "./content/content_source.js";
import type { DerivedViewRegistry } from "./derived/derived_view.js";
import type { Observability } from "./observability.js";
import type { PipelineOptions } from "./pipeline_types.js";
import type { PluginCache } from "./plugin/plugin_cache.js";
import type { RiebeckitePlugin } from "./types/plugin.js";
import type {
  MarkdownExecutionContext,
  MarkdownPipelineContext,
} from "./types/plugin_pipeline.js";
import type { PostContent } from "./types/post_content.js";

export interface PipelineContext {
  contentIndex: Map<string, string>;
  permalinks: ReadonlyMap<string, string>;
  getMarkdownBySlug?: (slug: string) => Promise<string>;
  options: PipelineOptions;
  isBuildTime: unknown;
  pluginCaches: Map<string, PluginCache>;
  derivedViews: DerivedViewRegistry;
  persistentCache: PersistentContentCache | null;
  pipelineFingerprint: string | null;
  resolvedPlugins: RiebeckitePlugin[] | null;
  execute(
    markDownContent: string,
    context?: MarkdownExecutionContext,
  ): Promise<PostContent>;
  dispose(): void;
  executeWithEmbedState(
    markDownContent: string,
    context: MarkdownExecutionContext,
    embedDepth: number,
    embedTrail: ReadonlySet<string>,
    rootDependencyTracker: ContentDependencyTracker | null,
  ): Promise<PostContent>;
  reportContentDependencies(
    slug: string,
    dependencies: readonly CachedContentDependency[],
  ): void;
  contentPipelineFingerprint(slug: string, source: string): string;
  findInvalidDependency(
    dependencies: readonly CachedContentDependency[],
  ): Promise<CachedContentDependency | null>;
  getPermalink(slug: string): string;
  resolveLinkDependency(id: string): string;
  recordNoteLinkDependencies(
    markdown: string,
    dependencyTracker: ContentDependencyTracker,
    sourcePath: string,
  ): void;
  use(
    processor: ReturnType<typeof unified>,
    plugin: unknown,
    options?: unknown,
  ): void;
  createNoteEmbedRenderer(
    embedDepth: number,
    embedTrail: ReadonlySet<string>,
    dependencyTracker: ContentDependencyTracker | null,
    currentSlug: string | undefined,
  ): MarkdownPipelineContext["renderNoteEmbed"];
  resolvePlugins(): RiebeckitePlugin[];
  createContentRenderer(
    contentSource: ContentSource | undefined,
  ): MarkdownPipelineContext["renderContent"];
  cacheFor(plugin: RiebeckitePlugin, observability: Observability): PluginCache;
  derivedCache(): PluginCache;
}

export function asPipelineContext<Self>(self: Self): PipelineContext {
  return self as PipelineContext;
}
