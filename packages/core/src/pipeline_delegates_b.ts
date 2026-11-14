import type { unified } from "unified";
import type {
  CachedContentDependency,
  ContentDependencyTracker,
} from "./content/content_dependency_tracker.js";
import type { ContentSource } from "./content/content_source.js";
import type { Observability } from "./observability.js";
import { asPipelineContext } from "./pipeline_context.js";
import { PipelineDelegatesA } from "./pipeline_delegates_a.js";
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
} from "./pipeline_methods_b.js";
import type { PluginCache } from "./plugin/plugin_cache.js";
import type { RiebeckitePlugin } from "./types/plugin.js";
import type { MarkdownPipelineContext } from "./types/plugin_pipeline.js";

export class PipelineDelegatesB extends PipelineDelegatesA {
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
  ): MarkdownPipelineContext["renderContent"] =>
    createContentRendererImpl(asPipelineContext(this), contentSource);

  cacheFor = (
    plugin: RiebeckitePlugin,
    observability: Observability,
  ): PluginCache =>
    cacheForImpl(asPipelineContext(this), plugin, observability);

  derivedCache = (): PluginCache => derivedCacheImpl(asPipelineContext(this));
}
