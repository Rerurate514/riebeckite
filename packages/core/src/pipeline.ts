import { createContentDependencyTracker } from "./content/content_dependency_tracker.js";
import type { PersistentContentCache } from "./content/content_persistent_cache.js";
import type { DerivedViewRegistry } from "./derived/derived_view.js";
import type { PipelineContext } from "./pipeline_context.js";
import { PipelineDelegatesB } from "./pipeline_delegates_b.js";
import { initializePipeline } from "./pipeline_state.js";
import type { PipelineOptions } from "./pipeline_types.js";
import type { PluginCache } from "./plugin/plugin_cache.js";
import type { RiebeckitePlugin } from "./types/plugin.js";
import type { MarkdownExecutionContext } from "./types/plugin_pipeline.js";
import type { PostContent } from "./types/post_content.js";

export type { PipelineOptions } from "./pipeline_types.js";

export class Pipeline extends PipelineDelegatesB {
  contentIndex!: Map<string, string>;
  permalinks!: ReadonlyMap<string, string>;
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
  ) {
    super();
    initializePipeline(
      this as unknown as PipelineContext,
      contentIndex,
      permalinks,
      getMarkdownBySlug,
      options,
      isBuildTime,
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
}
