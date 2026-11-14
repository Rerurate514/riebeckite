import type { unified } from "unified";
import type {
  CachedContentDependency,
  ContentDependencyTracker,
} from "./content/content_dependency_tracker.js";
import type { ContentSource } from "./content/content_source.js";
import type { Observability } from "./observability.js";
import type { PipelineContext } from "./pipeline_context.js";
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
    reportContentDependenciesImpl(
      this as unknown as PipelineContext,
      slug,
      dependencies,
    );

  contentPipelineFingerprint = (slug: string, source: string): string =>
    contentPipelineFingerprintImpl(
      this as unknown as PipelineContext,
      slug,
      source,
    );

  findInvalidDependency = async (
    dependencies: readonly CachedContentDependency[],
  ): Promise<CachedContentDependency | null> =>
    await findInvalidDependencyImpl(
      this as unknown as PipelineContext,
      dependencies,
    );

  getPermalink = (slug: string): string =>
    getPermalinkImpl(this as unknown as PipelineContext, slug);

  resolveLinkDependency = (id: string): string =>
    resolveLinkDependencyImpl(this as unknown as PipelineContext, id);

  recordNoteLinkDependencies = (
    markdown: string,
    dependencyTracker: ContentDependencyTracker,
    sourcePath: string,
  ): void =>
    recordNoteLinkDependenciesImpl(
      this as unknown as PipelineContext,
      markdown,
      dependencyTracker,
      sourcePath,
    );

  use = (
    processor: ReturnType<typeof unified>,
    plugin: unknown,
    options?: unknown,
  ) => useImpl(this as unknown as PipelineContext, processor, plugin, options);

  createNoteEmbedRenderer = (
    embedDepth: number,
    embedTrail: ReadonlySet<string>,
    dependencyTracker: ContentDependencyTracker | null,
    currentSlug: string | undefined,
  ): MarkdownPipelineContext["renderNoteEmbed"] =>
    createNoteEmbedRendererImpl(
      this as unknown as PipelineContext,
      embedDepth,
      embedTrail,
      dependencyTracker,
      currentSlug,
    );

  resolvePlugins = (): RiebeckitePlugin[] =>
    resolvePluginsImpl(this as unknown as PipelineContext);

  createContentRenderer = (
    contentSource: ContentSource | undefined,
  ): MarkdownPipelineContext["renderContent"] =>
    createContentRendererImpl(
      this as unknown as PipelineContext,
      contentSource,
    );

  cacheFor = (
    plugin: RiebeckitePlugin,
    observability: Observability,
  ): PluginCache =>
    cacheForImpl(this as unknown as PipelineContext, plugin, observability);

  derivedCache = (): PluginCache =>
    derivedCacheImpl(this as unknown as PipelineContext);
}
