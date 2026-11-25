import type { unified } from "unified";
import type {
  CachedContentDependency,
  ContentDependencyTracker,
} from "./content/content_dependency_tracker.js";
import { createContentDependencyTracker } from "./content/content_dependency_tracker.js";
import type { PersistentContentCache } from "./content/content_persistent_cache.js";
import type { ContentSource } from "./content/content_source.js";
import type { DerivedViewRegistry } from "./derived/derived_view.js";
import type { Observability } from "./observability.js";
import { asPipelineContext } from "./pipeline_context.js";
import { executeWithEmbedStateImpl } from "./pipeline_execution.js";
import {
  cacheForImpl,
  contentPipelineFingerprintImpl,
  createContentRendererImpl,
  createNoteEmbedRendererImpl,
  derivedCacheImpl,
  findInvalidDependencyImpl,
  getPermalinkImpl,
  recordNoteLinkDependenciesImpl,
  reportContentDependenciesImpl,
  resolveLinkDependencyImpl,
  resolvePluginsImpl,
  useImpl,
} from "./pipeline_operations.js";
import { initializePipeline } from "./pipeline_state.js";
import type { PipelineOptions } from "./pipeline_types.js";
import type { PluginCache } from "./plugin/plugin_cache.js";
import type { RiebeckitePlugin } from "./types/plugin.js";
import type {
  MarkdownExecutionContext,
  MarkdownPipelineContext,
} from "./types/plugin_pipeline.js";
import type { PostContent } from "./types/post_content.js";
import type { UiLabelContext } from "./types/ui_labels.js";

export type { PipelineOptions } from "./pipeline_types.js";

export class Pipeline {
  contentIndex!: Map<string, string>;
  permalinks!: ReadonlyMap<string, string>;
  uiLabelsBySlug!: ReadonlyMap<string, UiLabelContext>;
  getMarkdownBySlug?: (slug: string) => Promise<string>;
  options!: PipelineOptions;
  isBuildTime!: boolean;
  pluginCaches!: Map<string, PluginCache>;
  derivedViews!: DerivedViewRegistry;
  persistentCache!: PersistentContentCache | null;
  pipelineFingerprint!: string | null;
  resolvedPlugins!: RiebeckitePlugin[] | null;

  constructor(
    contentIndex: Map<string, string>,
    permalinks: ReadonlyMap<string, string>,
    getMarkdownBySlug?: (slug: string) => Promise<string>,
    options: PipelineOptions = {},
    isBuildTime = false,
    uiLabelsBySlug: ReadonlyMap<string, UiLabelContext> = new Map(),
  ) {
    initializePipeline(
      asPipelineContext(this),
      contentIndex,
      permalinks,
      getMarkdownBySlug,
      options,
      isBuildTime,
      uiLabelsBySlug,
    );
  }

  async execute(
    markDownContent: string,
    context: MarkdownExecutionContext = {},
  ): Promise<PostContent> {
    const dependencyTracker =
      this.options.contentSource &&
      (this.persistentCache || this.options.onContentDependencies)
        ? createContentDependencyTracker(this.options.contentSource)
        : null;
    return await this.executeWithEmbedState(
      markDownContent,
      context,
      0,
      new Set(context.sourceSlug ? [context.sourceSlug] : []),
      dependencyTracker,
    );
  }

  dispose(): void {
    this.derivedViews.dispose();
  }

  executeWithEmbedState = async (
    markDownContent: string,
    context: MarkdownExecutionContext,
    embedDepth: number,
    embedTrail: ReadonlySet<string>,
    rootDependencyTracker: ContentDependencyTracker | null,
  ): Promise<PostContent> =>
    await executeWithEmbedStateImpl(
      asPipelineContext(this),
      markDownContent,
      context,
      embedDepth,
      embedTrail,
      rootDependencyTracker,
    );

  reportContentDependencies = (
    slug: string,
    dependencies: readonly CachedContentDependency[],
  ): void =>
    reportContentDependenciesImpl(asPipelineContext(this), slug, dependencies);

  contentPipelineFingerprint = (slug: string, source: string): string =>
    contentPipelineFingerprintImpl(asPipelineContext(this), slug, source);

  findInvalidDependency = async (
    dependencies: readonly CachedContentDependency[],
  ): Promise<CachedContentDependency | null> =>
    await findInvalidDependencyImpl(asPipelineContext(this), dependencies);

  getPermalink = (slug: string): string =>
    getPermalinkImpl(asPipelineContext(this), slug);

  resolveLinkDependency = (id: string): string =>
    resolveLinkDependencyImpl(asPipelineContext(this), id);

  recordNoteLinkDependencies = (
    markdown: string,
    dependencyTracker: ContentDependencyTracker,
    sourcePath: string,
  ): void =>
    recordNoteLinkDependenciesImpl(
      asPipelineContext(this),
      markdown,
      dependencyTracker,
      sourcePath,
    );

  use = (
    processor: ReturnType<typeof unified>,
    plugin: unknown,
    options?: unknown,
  ) => useImpl(asPipelineContext(this), processor, plugin, options);

  createNoteEmbedRenderer = (
    embedDepth: number,
    embedTrail: ReadonlySet<string>,
    dependencyTracker: ContentDependencyTracker | null,
    currentSlug: string | undefined,
  ): MarkdownPipelineContext["renderNoteEmbed"] =>
    createNoteEmbedRendererImpl(
      asPipelineContext(this),
      embedDepth,
      embedTrail,
      dependencyTracker,
      currentSlug,
    );

  resolvePlugins = (): RiebeckitePlugin[] =>
    resolvePluginsImpl(asPipelineContext(this));

  createContentRenderer = (
    contentSource: ContentSource | undefined,
    uiLabels: UiLabelContext,
  ): MarkdownPipelineContext["renderContent"] =>
    createContentRendererImpl(asPipelineContext(this), contentSource, uiLabels);

  cacheFor = (
    plugin: RiebeckitePlugin,
    observability: Observability,
  ): PluginCache =>
    cacheForImpl(asPipelineContext(this), plugin, observability);

  derivedCache = (): PluginCache => derivedCacheImpl(asPipelineContext(this));
}
