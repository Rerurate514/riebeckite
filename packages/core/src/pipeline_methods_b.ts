import type { unified } from "unified";
import {
  type CachedContentDependency,
  type ContentDependencyTracker,
  createContentDependencyTracker,
  fingerprintContent,
  LINK_INDEX_PREFIX,
  LINK_LOCATION_PREFIX,
} from "./content/content_dependency_tracker.js";
import { extractContentLinks } from "./content/content_links.js";
import { computeContentCacheFingerprint } from "./content/content_persistent_cache.js";
import type { ContentSource } from "./content/content_source.js";
import { selectEmbedMarkdownFragment } from "./markdown_fragments.js";
import { resolveLinkDependencyValue } from "./markdown_links.js";
import { noopObservability, type Observability } from "./observability.js";
import type { PipelineContext } from "./pipeline_context.js";
import { assertUniqueDerivedViewIds } from "./pipeline_helpers.js";
import {
  createPluginCache,
  createUnavailablePluginCache,
  type PluginCache,
  resolvePluginCacheDirectory,
} from "./plugin/plugin_cache.js";
import { createUnavailableGeneratedOutputSink } from "./types/generated_output.js";
import { type RiebeckitePlugin, resolvePlugins } from "./types/plugin.js";
import type {
  MarkdownEmbedFragment,
  MarkdownPipelineContext,
} from "./types/plugin_pipeline.js";

export function reportContentDependenciesImpl(
  m: PipelineContext,
  slug: string,
  dependencies: readonly CachedContentDependency[],
): void {
  m.options.onContentDependencies?.(slug, dependencies);
}

export function contentPipelineFingerprintImpl(
  m: PipelineContext,
  slug: string,
  source: string,
): string {
  const config = m.options.config;
  if (!config || !m.pipelineFingerprint) return "";
  return `${m.pipelineFingerprint}:${computeContentCacheFingerprint(slug, source, config)}`;
}

export async function findInvalidDependencyImpl(
  m: PipelineContext,
  dependencies: readonly CachedContentDependency[],
): Promise<CachedContentDependency | null> {
  const contentSource = m.options.contentSource;
  if (!contentSource) return null;
  const validationTracker = createContentDependencyTracker(contentSource);
  for (const dep of dependencies) {
    if (dep.kind === "content") {
      const content = await validationTracker.readContent(
        dep.id,
        async () => (await m.getMarkdownBySlug?.(dep.id)) ?? "",
      );
      if (fingerprintContent(content) !== dep.fingerprint) return dep;
    } else if (dep.kind === "file") {
      const fileContent = await validationTracker.contentSource.read({
        path: dep.id,
      });
      if (fingerprintContent(fileContent) !== dep.fingerprint) return dep;
    } else if (dep.kind === "link") {
      if (
        fingerprintContent(m.resolveLinkDependency(dep.id)) !== dep.fingerprint
      ) {
        return dep;
      }
    }
  }
  return null;
}

export function getPermalinkImpl(m: PipelineContext, slug: string): string {
  const permalink = m.permalinks.get(slug);
  if (!permalink) {
    throw new Error(`Content public location was not resolved: ${slug}`);
  }
  return permalink;
}

export function resolveLinkDependencyImpl(
  m: PipelineContext,
  id: string,
): string {
  return resolveLinkDependencyValue(
    id,
    m.contentIndex,
    (slug) => m.permalinks.get(slug),
    m.options.isRoutable,
  );
}

export function recordNoteLinkDependenciesImpl(
  m: PipelineContext,
  markdown: string,
  dependencyTracker: ContentDependencyTracker,
  sourcePath: string,
): void {
  for (const link of extractContentLinks(
    markdown,
    m.contentIndex,
    undefined,
    sourcePath,
  )) {
    if (link.slug !== null && link.kind === "note") {
      const id = `${LINK_LOCATION_PREFIX}${link.slug}`;
      dependencyTracker.recordLinkResolution(id, m.resolveLinkDependency(id));
      continue;
    }
    if (link.kind === "unresolved") {
      const id = `${LINK_INDEX_PREFIX}${link.raw.toLowerCase()}`;
      dependencyTracker.recordLinkResolution(id, m.resolveLinkDependency(id));
    }
  }
}

export function useImpl(
  _m: PipelineContext,
  processor: ReturnType<typeof unified>,
  plugin: unknown,
  options?: unknown,
) {
  const register = processor.use.bind(processor) as (
    plugin: unknown,
    options?: unknown,
  ) => unknown;
  if (options === undefined) {
    register(plugin);
  } else {
    register(plugin, options);
  }
}

export function createNoteEmbedRendererImpl(
  m: PipelineContext,
  embedDepth: number,
  embedTrail: ReadonlySet<string>,
  dependencyTracker: ContentDependencyTracker | null,
  currentSlug: string | undefined,
): MarkdownPipelineContext["renderNoteEmbed"] {
  if (!m.getMarkdownBySlug || embedDepth >= 3) return undefined;

  return async (slug: string, fragment: MarkdownEmbedFragment | null) => {
    if (m.options.isRoutable && !m.options.isRoutable(slug)) {
      return null;
    }
    // A same-note embed is safe only for a fragment: the embed trail already
    // contains the note, and the depth limit stops a section that contains its
    // own embed from recursing.
    const selfEmbed = slug === currentSlug && fragment !== null;
    if (embedTrail.has(slug) && !selfEmbed) return null;

    const sourceMarkdown = await m.getMarkdownBySlug?.(slug);
    const markdown = sourceMarkdown
      ? selectEmbedMarkdownFragment(sourceMarkdown, fragment)
      : null;
    if (!markdown) return null;

    const nextEmbedTrail = new Set(embedTrail);
    nextEmbedTrail.add(slug);

    // Record every embed at any depth so transitive embed dependencies are
    // captured by the root cache entry.
    if (dependencyTracker) {
      await dependencyTracker.readContent(slug, async () => markdown);
    }

    const content = await m.executeWithEmbedState(
      markdown,
      { sourceSlug: slug },
      embedDepth + 1,
      nextEmbedTrail,
      dependencyTracker,
    );
    return content.html;
  };
}

export function resolvePluginsImpl(m: PipelineContext): RiebeckitePlugin[] {
  if (m.resolvedPlugins === null) {
    m.resolvedPlugins = resolvePlugins(m.options.plugins);
    assertUniqueDerivedViewIds(m.resolvedPlugins);
    for (const plugin of m.resolvedPlugins) {
      for (const view of plugin.derivedViews ?? []) {
        m.derivedViews.register(view);
      }
    }
  }
  return m.resolvedPlugins;
}

export function createContentRendererImpl(
  m: PipelineContext,
  contentSource: ContentSource | undefined,
): MarkdownPipelineContext["renderContent"] {
  const renderers = m
    .resolvePlugins()
    .flatMap((plugin) =>
      (plugin.renderers ?? []).map((renderer) => ({ plugin, renderer })),
    );
  if (renderers.length === 0) return undefined;

  return async (input) => {
    for (const { plugin, renderer } of renderers) {
      const observability = m.options.observability ?? noopObservability;
      const html = await observability.tracer.span(
        "plugin.render",
        {
          plugin: plugin.name,
          contentPath: input.path,
          target: input.kind,
        },
        () =>
          renderer.render({
            config: m.options.config,
            contentIndex: m.contentIndex,
            diagnostics: [],
            cache: m.cacheFor(plugin, observability),
            derived: m.derivedViews,
            output: createUnavailableGeneratedOutputSink(),
            logger: observability.logger.child({ plugin: plugin.name }),
            tracer: observability.tracer,
            contentSource,
            ...input,
          }),
      );
      if (html) return html;
    }
    return null;
  };
}

export function cacheForImpl(
  m: PipelineContext,
  plugin: RiebeckitePlugin,
  observability: Observability,
): PluginCache {
  const cached = m.pluginCaches.get(plugin.name);
  if (cached) return cached;

  const cache = m.isBuildTime
    ? createPluginCache({
        pluginName: plugin.name,
        cacheVersion: plugin.cacheVersion,
        cacheDirectory: resolvePluginCacheDirectory(m.options.config),
        tracer: observability.tracer,
        logger: observability.logger.child({ plugin: plugin.name }),
      })
    : createUnavailablePluginCache();
  m.pluginCaches.set(plugin.name, cache);
  return cache;
}

export function derivedCacheImpl(m: PipelineContext): PluginCache {
  if (!m.isBuildTime) return createUnavailablePluginCache();
  const observability = m.options.observability ?? noopObservability;
  return createPluginCache({
    pluginName: "riebeckite-derived-data",
    cacheVersion: "2",
    cacheDirectory: resolvePluginCacheDirectory(m.options.config),
    tracer: observability.tracer,
    logger: observability.logger.child({
      plugin: "riebeckite-derived-data",
    }),
  });
}
