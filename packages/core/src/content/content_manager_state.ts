import type { PipelineOptions } from "../pipeline.js";
import { PluginRuntime } from "../plugin/plugin_runtime.js";
import type { PostContent } from "../types/post_content.js";
import { ContentBuildCoordinator } from "./content_build_coordinator.js";
import { ContentBuildSession } from "./content_build_session.js";
import { resolveContentBuildStatePath } from "./content_build_state_store.js";
import type { CachedContentDependency } from "./content_dependency_tracker.js";
import { ContentEntryReader } from "./content_entry_reader.js";
import { createContentFormatRegistry } from "./content_format.js";
import { ContentIndexBuilder } from "./content_index_builder.js";
import { ContentLocationResolver } from "./content_location_resolver.js";
import type { ContentManagerContext } from "./content_manager_context.js";
import { ContentOutputResolver } from "./content_output_resolver.js";
import { type ContentSource, cacheContentSource } from "./content_source.js";
import { ManifestAssembler } from "./manifest_assembler.js";
import { resolvePublishingBuildTime } from "./publishing.js";

export function initializeContentManager(
  m: ContentManagerContext,
  content: ContentSource,
  _exclude: string[] = [],
  pipelineOptions: PipelineOptions = {},
): void {
  m.contentIndex = null;
  m.contentIndexAmbiguities = new Map();
  m.contentIndexPromise = null;
  m.contentCache = new Map<string, PostContent>();
  m.manifest = null;
  m.manifestPromise = null;
  m.routeManifest = null;
  m.routeManifestPromise = null;
  m.pipelineFingerprint = null;
  m.pipeline = null;
  m.pipelinePromise = null;
  m.isBuildTime = false;
  m.routableSlugs = null;
  m.routableSlugsPromise = null;
  m.processedContentCount = 0;
  m.reusedContentCount = 0;
  m.outputChangeSet = null;
  m.completedBuildSnapshot = null;
  m.finalHtmlDiagnostics = [];
  m.buildStateCommitRequested = false;
  m.buildStateCommitted = false;
  m.cacheManifestEntries = [];
  m.trackedContentDependencies = new Map<
    string,
    readonly CachedContentDependency[]
  >();
  m.processedContentCacheFingerprints = new Map<string, string | undefined>();
  m.processedContentDurations = new Map<string, number>();
  const config = pipelineOptions.config
    ? {
        ...pipelineOptions.config,
        plugins: pipelineOptions.plugins ?? pipelineOptions.config.plugins,
      }
    : undefined;
  m.publishingBuildTime = resolvePublishingBuildTime(
    pipelineOptions.publishingBuildTime,
  );
  m.source = cacheContentSource(content);
  m.pipelineOptions = {
    ...pipelineOptions,
    config,
    plugins: pipelineOptions.plugins ?? config?.plugins,
    isRoutable: (slug) => m.isRoutable(slug),
    publishingBuildTime: m.publishingBuildTime,
    contentSource: m.source,
    onContentDependencies: (slug, dependencies) => {
      m.trackedContentDependencies.set(slug, dependencies);
    },
  };
  m.formats = createContentFormatRegistry(m.pipelineOptions.plugins);
  m.contentIndexBuilder = new ContentIndexBuilder(
    m.source,
    (path) => m.formats.isContentPath(path),
    (path) => m.formats.toSlug(path) ?? path,
  );
  m.manifestAssembler = new ManifestAssembler(m.contentCache);
  m.pluginRuntime = new PluginRuntime(m.pipelineOptions);
  m.pluginRuntime.setPageMarkdownRenderer(async (markdown) => {
    return (await (await m.getPipeline()).execute(markdown)).html;
  });
  const buildStatePath = resolveContentBuildStatePath(
    pipelineOptions.config,
    undefined,
  );
  const observability = m.observability();
  m.entryReader = new ContentEntryReader(m.source, observability, (path) =>
    m.formats.isContentPath(path),
  );
  m.locationResolver = new ContentLocationResolver({
    getEntries: () => m.entryReader.getEntries(),
    readEntry: (entry) => m.entryReader.read(entry),
    getContentIndex: () => m.getContentIndex(),
    pluginRuntime: m.pluginRuntime,
    observability,
    toSlug: (path) => m.formats.toSlug(path),
  });
  m.buildCoordinator = new ContentBuildCoordinator({
    buildStatePath,
    getEntries: () => m.entryReader.getEntries(),
    readEntry: (entry) => m.entryReader.read(entry),
    observability,
    pathResolver: {
      isContentPath: (path) => m.formats.isContentPath(path),
      toSlug: (path) => m.formats.toSlug(path),
    },
    getContentDependencies: async (entry, paths) => {
      const format = m.formats.get(entry.path);
      if (!format?.dependencies) return [];
      return await format.dependencies({
        sourcePath: entry.path,
        source: await m.entryReader.read(entry),
        paths,
      });
    },
    includeFileMetadata:
      m.pipelineOptions.plugins?.some(
        (plugin) => plugin && plugin.contentFileMetadata === true,
      ) ?? false,
  });
  m.outputResolver = new ContentOutputResolver(
    m.pluginRuntime,
    observability,
    (path) => m.formats.toSlug(path),
  );
  m.buildSession = new ContentBuildSession({
    config: () => m.pipelineOptions.config,
    enableBuildTime: () => m.enableBuildTime(),
    getContentIndex: () => m.getContentIndex(),
    getContentLocations: () => m.getContentLocations(),
    computePipelineFingerprint: (locations) =>
      (m.pipelineFingerprint = m.computePipelineFingerprint(locations)),
    getPipelineFingerprint: () => m.getPipelineFingerprint(),
    requiresFullContentRegeneration: () => m.requiresFullContentRegeneration(),
    pluginRuntime: m.pluginRuntime,
    buildCoordinator: m.buildCoordinator,
    observability,
    publishingBuildTime: m.publishingBuildTime,
  });
}
