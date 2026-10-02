import { VFile } from "vfile";
import { matter } from "vfile-matter";
import type { Observability } from "../observability.js";
import { noopObservability } from "../observability.js";
import type { PipelineOptions } from "../pipeline.js";
import { Pipeline } from "../pipeline.js";
import { PluginRuntime } from "../plugin/plugin_runtime.js";
import type {
  ContentManifest,
  ContentManifestEntry,
  ContentPublicLocation,
} from "../types/content_manifest.js";
import type { Diagnostic } from "../types/diagnostic.js";
import type { ResolvedPluginPage } from "../types/plugin_page.js";
import type { PostContent, PostFrontmatter } from "../types/post_content.js";
import type { PublishStrategy } from "../types/publish_strategy.js";
import type { ResolvedRiebeckiteConfig } from "../types/resolved_riebeckite_config.js";
import {
  ContentBuildCoordinator,
  type ContentBuildPreparation,
} from "./content_build_coordinator.js";
import { CONTENT_BUILD_STATE_EXCLUDE } from "./content_build_state.js";
import { resolveContentBuildStatePath } from "./content_build_state_store.js";
import { hasContentChanges } from "./content_change_set.js";
import { ContentEntryReader } from "./content_entry_reader.js";
import type { ContentGraph } from "./content_graph.js";
import { ContentIndexBuilder } from "./content_index_builder.js";
import { ContentLocationResolver } from "./content_location_resolver.js";
import { computePipelineFingerprint } from "./content_persistent_cache.js";
import type { ContentSource, ContentSourceEntry } from "./content_source.js";
import { FileSystemContentSource } from "./file_system_content_source.js";
import { ManifestBuilder } from "./manifest_builder.js";
import {
  determineOutputChanges,
  type OutputChangeSet,
} from "./output_dependency.js";
import {
  resolvePublishingBuildTime,
  resolvePublishingState,
} from "./publishing.js";

export type Backlink = {
  slug: string;
};

export type ContentPostReference = {
  slug: string;
};

export type ContentBuildOptions = {
  incremental?: boolean;
};

export type ContentInspection = {
  readonly entries: readonly ContentSourceEntry[];
  readonly contentIndex: ReadonlyMap<string, string>;
  readonly diagnostics: readonly Diagnostic[];
};

const CONTENT_PROCESSING_CONCURRENCY = 16;

export class ContentManager {
  private source: ContentSource;
  private contentIndexBuilder: ContentIndexBuilder;
  private manifestBuilder = new ManifestBuilder();
  private pluginRuntime: PluginRuntime;
  private contentIndex: Map<string, string> | null = null;
  private contentCache = new Map<string, PostContent>();
  private manifest: ContentManifest | null = null;
  private manifestPromise: Promise<ContentManifest> | null = null;
  private pipeline: Pipeline | null = null;
  private entryReader: ContentEntryReader;
  private locationResolver: ContentLocationResolver;
  private buildCoordinator: ContentBuildCoordinator;
  private isBuildTime = false;
  private publishingBuildTime: Date;
  private routableSlugs: Set<string> | null = null;
  private processedContentCount = 0;
  private outputChangeSet: OutputChangeSet | null = null;

  constructor(
    content: string | ContentSource,
    exclude: string[] = [],
    private pipelineOptions: PipelineOptions = {},
  ) {
    this.pipelineOptions = {
      ...pipelineOptions,
      plugins: pipelineOptions.plugins ?? pipelineOptions.config?.plugins,
      isRoutable: (slug) => this.isRoutable(slug),
    };
    this.publishingBuildTime = resolvePublishingBuildTime(
      pipelineOptions.publishingBuildTime,
    );
    this.source =
      typeof content === "string"
        ? (pipelineOptions.config?.content.source ??
          new FileSystemContentSource(content, [
            ...exclude,
            CONTENT_BUILD_STATE_EXCLUDE,
          ]))
        : content;
    this.pipelineOptions = {
      ...this.pipelineOptions,
      contentSource: this.source,
    };
    this.contentIndexBuilder = new ContentIndexBuilder(this.source);
    this.pluginRuntime = new PluginRuntime(this.pipelineOptions);
    const buildStatePath = resolveContentBuildStatePath(
      pipelineOptions.config,
      typeof content === "string" ? content : undefined,
    );
    const observability = this.observability();
    this.entryReader = new ContentEntryReader(this.source, observability);
    this.locationResolver = new ContentLocationResolver({
      getEntries: () => this.entryReader.getEntries(),
      readEntry: (entry) => this.entryReader.read(entry),
      getContentIndex: () => this.getContentIndex(),
      pluginRuntime: this.pluginRuntime,
      observability,
    });
    this.buildCoordinator = new ContentBuildCoordinator({
      buildStatePath,
      getEntries: () => this.entryReader.getEntries(),
      readEntry: (entry) => this.entryReader.read(entry),
      observability,
    });
  }

  async getAllPosts(): Promise<ContentPostReference[]> {
    return (await this.scan())
      .filter((entry) => entry.path.endsWith(".md"))
      .map((entry) => ({ slug: entry.path.replace(/\.md$/, "") }));
  }

  async scan(): Promise<readonly ContentSourceEntry[]> {
    return await this.entryReader.getEntries();
  }

  async getPost(slug: string): Promise<string> {
    return await this.entryReader.readText(`${slug}.md`);
  }

  async getContentIndex(
    preparation?: ContentBuildPreparation,
  ): Promise<Map<string, string>> {
    if (this.contentIndex) return this.contentIndex;

    if (
      preparation?.previousState &&
      !hasContentChanges(preparation.changeSet)
    ) {
      this.contentIndex = new Map(
        Object.entries(preparation.previousState.contentIndex),
      );
      return this.contentIndex;
    }

    if (preparation) {
      this.contentIndex = preparation.currentContentIndex;
      return this.contentIndex;
    }

    this.contentIndex = await this.observability().tracer.span(
      "content.index",
      {},
      async () =>
        await this.contentIndexBuilder.build(
          await this.entryReader.getEntries(),
          (entry) => this.entryReader.read(entry),
        ),
    );
    return this.contentIndex;
  }

  async getProcessedContent(slug: string): Promise<PostContent> {
    const cached = this.contentCache.get(slug);
    if (cached) return cached;

    return await this.observability().tracer.span(
      "content.process",
      {
        contentPath: `${slug}.md`,
      },
      async () => {
        const [contentIndex, rawPost] = await Promise.all([
          this.getContentIndex(),
          this.getPost(slug),
        ]);

        await this.pluginRuntime.startBuild(contentIndex);
        await this.pluginRuntime.runContentLoaded(slug, rawPost, contentIndex);

        await this.ensureRoutableSlugs();
        this.pipeline ??= new Pipeline(
          contentIndex,
          await this.locationResolver.getPermalinks(),
          (postSlug) => this.getPost(postSlug),
          this.pipelineOptions,
          this.isBuildTime,
        );
        const content = await this.pipeline.execute(rawPost, {
          sourceSlug: slug,
        });
        this.processedContentCount += 1;
        if (this.processedContentCount % 100 === 0) {
          this.observability().tracer.event("content.process.sample", {
            processed: this.processedContentCount,
          });
        }

        await this.pluginRuntime.runPostHook(
          "onPostParsed",
          slug,
          rawPost,
          content,
          contentIndex,
        );
        await this.pluginRuntime.runPostHook(
          "onPostProcessed",
          slug,
          rawPost,
          content,
          contentIndex,
        );

        this.contentCache.set(slug, content);
        return content;
      },
    );
  }

  async getManifest(options?: ContentBuildOptions): Promise<ContentManifest> {
    if (this.manifest) return this.manifest;
    if (this.manifestPromise) return await this.manifestPromise;

    this.manifestPromise = this.buildManifest(options);
    try {
      return await this.manifestPromise;
    } catch (error) {
      this.manifestPromise = null;
      throw error;
    }
  }

  private async buildManifest(
    options?: ContentBuildOptions,
  ): Promise<ContentManifest> {
    if (this.manifest) return this.manifest;

    // Plugin caches (and pipeline caches) must be usable whenever a manifest is
    // built, not only for explicit incremental builds: the SSG pass builds its
    // own ContentManager and relies on persisted plugin state (e.g. rename
    // detection) without requesting an incremental build. The incremental
    // coordinator still runs only when build options are supplied.
    this.enableBuildTime();

    const preparation = options
      ? await this.buildCoordinator.getPreparation(
          options.incremental,
          this.getPipelineFingerprint(),
        )
      : undefined;
    return await this.observability().tracer.span(
      "content.manifest",
      {},
      async () => {
        const [posts, contentIndex, locations] = await Promise.all([
          this.getAllPosts(),
          this.getContentIndex(preparation),
          this.getContentLocations(),
        ]);
        const entries = await this.observability().tracer.span(
          "content.manifest.entries",
          {},
          () =>
            mapConcurrent(
              posts,
              CONTENT_PROCESSING_CONCURRENCY,
              async (post) => {
                const reused = this.reuseManifestEntry(post.slug, preparation);
                if (reused) return reused;

                const [rawPost, processed] = await Promise.all([
                  this.getPost(post.slug),
                  this.getProcessedContent(post.slug),
                ]);
                const location = locations.get(post.slug);
                if (!location) {
                  throw new Error(
                    `Content public location was not resolved: ${post.slug}`,
                  );
                }

                return this.manifestBuilder.createEntry(
                  post.slug,
                  rawPost,
                  processed,
                  contentIndex,
                  location,
                  resolvePublishingState(processed.frontmatter, {
                    strategy: this.publishStrategy(),
                    buildTime: this.publishingBuildTime,
                  }),
                );
              },
            ),
        );

        await this.pluginRuntime.runGraphHook(entries, contentIndex);
        const manifest = await this.observability().tracer.span(
          "content.graph",
          {},
          () => this.manifestBuilder.build(entries, contentIndex),
        );
        this.locationResolver.populateRedirects(manifest, locations);
        this.applyPublicView(manifest);
        await this.pluginRuntime.runManifestCreated(manifest, contentIndex);
        manifest.pagePaths = [
          ...(await this.pluginRuntime.getPagePaths(manifest, contentIndex)),
        ];
        manifest.assets = this.pluginRuntime.collectAssets();
        manifest.clientEntries = this.pluginRuntime.collectClientEntries();
        manifest.diagnostics = [
          ...this.pluginRuntime.getDiagnostics(),
          ...(await this.pluginRuntime.collectDiagnostics(contentIndex)),
        ];

        await this.pluginRuntime.runBuildEnd(manifest, contentIndex);
        manifest.generatedOutputs =
          this.pluginRuntime.collectGeneratedOutputs();
        const pluginPageOutputs = await this.pluginRuntime.getPageOutputs(
          manifest,
          contentIndex,
        );
        this.outputChangeSet = preparation
          ? determineOutputChanges({
              manifest,
              previousState: preparation.previousState,
              changeSet: preparation.changeSet,
              affectedContent: preparation.affectedContent,
              pluginPageOutputs,
            })
          : null;
        if (this.outputChangeSet) {
          this.observability().tracer.event("build.incremental.outputs", {
            candidateOutputCount: this.outputChangeSet.candidateOutputCount,
            affectedOutputCount: this.outputChangeSet.affectedOutputCount,
            removedOutputCount: this.outputChangeSet.removedOutputCount,
            unchangedOutputCount: this.outputChangeSet.unchangedOutputCount,
            fullRegenerationRequired:
              this.outputChangeSet.fullRegenerationRequired,
          });
        }
        if (preparation)
          await this.buildCoordinator.commit(
            preparation,
            manifest,
            this.getPipelineFingerprint(),
            this.outputChangeSet
              ? [
                  ...this.outputChangeSet.affected,
                  ...this.outputChangeSet.unchanged,
                ]
              : [],
          );
        this.manifest = manifest;
        return manifest;
      },
    );
  }

  async build(options: ContentBuildOptions = {}): Promise<ContentManifest> {
    return await this.getManifest(options);
  }

  async getOutputChangeSet(
    options: ContentBuildOptions = {},
  ): Promise<OutputChangeSet> {
    await this.getManifest(options);
    if (!this.outputChangeSet) {
      const manifest = await this.getManifest();
      const contentIndex = await this.getContentIndex();
      const pluginPageOutputs = await this.pluginRuntime.getPageOutputs(
        manifest,
        contentIndex,
      );
      return determineOutputChanges({
        manifest,
        previousState: undefined,
        changeSet: {
          added: manifest.entries.map((entry) => `${entry.slug}.md`),
          changed: [],
          removed: [],
          unchanged: [],
        },
        affectedContent: {
          direct: new Set(manifest.entries.map((entry) => entry.slug)),
          dependent: new Set(),
        },
        pluginPageOutputs,
      });
    }
    return this.outputChangeSet;
  }

  async getBacklinks(targetSlug: string): Promise<Backlink[]> {
    const graph = await this.getContentGraph();
    return graph.incomingSlugs(targetSlug).map((slug) => ({
      slug,
    }));
  }

  async getContentGraph(): Promise<ContentGraph> {
    const manifest = await this.getManifest();
    return manifest.graph;
  }

  async getDiagnostics(): Promise<Diagnostic[]> {
    const manifest = await this.getManifest();
    return manifest.diagnostics;
  }

  /** Resolves a page contributed by an enabled plugin. */
  async resolvePage(pathname: string): Promise<ResolvedPluginPage | null> {
    const [manifest, contentIndex] = await Promise.all([
      this.getManifest(),
      this.getContentIndex(),
    ]);
    return await this.pluginRuntime.resolvePage(
      pathname,
      manifest,
      contentIndex,
    );
  }

  /** Returns plugin page paths for SSG enumeration. */
  async getPagePaths(): Promise<readonly string[]> {
    const [manifest, contentIndex] = await Promise.all([
      this.getManifest(),
      this.getContentIndex(),
    ]);
    return await this.pluginRuntime.getPagePaths(manifest, contentIndex);
  }

  async inspect(): Promise<ContentInspection> {
    const [entries, contentIndex] = await Promise.all([
      this.entryReader.getEntries(),
      this.getContentIndex(),
      // Location resolution is the generic phase where plugins can inspect all
      // content entries (including their frontmatter) and register diagnostics.
      // Run it for inspect/doctor as well as for a full manifest build.
      this.getContentLocations(),
    ]);
    const diagnostics =
      await this.pluginRuntime.collectDiagnostics(contentIndex);

    return { entries, contentIndex, diagnostics };
  }

  async dispose(): Promise<void> {
    if (!this.contentIndex) return;
    await this.pluginRuntime.dispose(this.contentIndex);
  }

  async getContentLocations(): Promise<
    ReadonlyMap<string, ContentPublicLocation>
  > {
    return await this.locationResolver.getLocations();
  }

  private applyPublicView(manifest: ContentManifest): void {
    const strategy = this.publishStrategy();
    for (const entry of manifest.entries) {
      entry.publishing = resolvePublishingState(entry.frontmatter, {
        strategy,
        buildTime: this.publishingBuildTime,
      });
    }
    manifest.publicEntries = manifest.entries.filter(
      (entry) => entry.publishing.routable,
    );
    manifest.discoverableEntries = manifest.entries.filter(
      (entry) => entry.publishing.discoverable,
    );

    const publicSlugs = new Set(
      manifest.publicEntries.map((entry) => entry.slug),
    );
    const publicPermalinks = new Map(
      manifest.publicEntries.map((entry) => [entry.permalink, entry]),
    );
    manifest.byRoutablePermalink = publicPermalinks;
    manifest.publicRedirects = new Map(
      [...manifest.redirects].filter(([, redirect]) =>
        publicSlugs.has(redirect.slug),
      ),
    );
  }

  private publishStrategy(): PublishStrategy {
    return (
      this.pipelineOptions.config?.content.filters.publishStrategy ?? "explicit"
    );
  }

  private reuseManifestEntry(
    slug: string,
    preparation: ContentBuildPreparation | undefined,
  ): ContentManifestEntry | null {
    if (!preparation?.previousState?.manifestEntries) return null;
    if (
      preparation.previousState.pipelineFingerprint !==
      this.getPipelineFingerprint()
    ) {
      return null;
    }
    if (preparation.affectedContent.direct.has(slug)) return null;
    if (preparation.affectedContent.dependent.has(slug)) return null;

    const entry = preparation.previousState.manifestEntries.find(
      (candidate) => candidate.slug === slug,
    );
    if (!entry) return null;
    this.observability().tracer.event("content.reuse", { slug });
    return {
      ...entry,
      publicLocation: { ...entry.publicLocation },
      frontmatter: { ...entry.frontmatter },
      tags: [...entry.tags],
      links: entry.links.map((link) => ({ ...link })),
      backlinks: [...entry.backlinks],
      assets: entry.assets.map((asset) => ({ ...asset })),
    };
  }

  private getPipelineFingerprint(): string | undefined {
    if (!this.pipelineOptions.config) return undefined;
    return computePipelineFingerprint(this.pipelineOptions.config);
  }

  private isRoutable(slug: string): boolean {
    if (!this.routableSlugs) {
      throw new Error(`Publishing state was not resolved: ${slug}`);
    }
    return this.routableSlugs.has(slug);
  }

  private async ensureRoutableSlugs(): Promise<Set<string>> {
    if (this.routableSlugs) return this.routableSlugs;

    const strategy = this.publishStrategy();
    const posts = await this.getAllPosts();
    const routableSlugs = new Set<string>();
    await mapConcurrent(posts, CONTENT_PROCESSING_CONCURRENCY, async (post) => {
      const markdown = await this.getPost(post.slug);
      const publishing = resolvePublishingState(readFrontmatter(markdown), {
        strategy,
        buildTime: this.publishingBuildTime,
      });
      if (publishing.routable) routableSlugs.add(post.slug);
    });
    this.routableSlugs = routableSlugs;
    return routableSlugs;
  }

  private enableBuildTime(): void {
    this.isBuildTime = true;
    this.pluginRuntime.enableBuildTime();
  }

  private observability(): Observability {
    return this.pipelineOptions.observability ?? noopObservability;
  }
}

declare module "../pipeline" {
  interface PipelineOptions {
    config?: ResolvedRiebeckiteConfig;
    publishingBuildTime?: Date | string;
  }
}

function readFrontmatter(markdown: string): PostFrontmatter {
  const file = new VFile({ value: markdown });
  matter(file);
  return (file.data.matter ?? {}) as PostFrontmatter;
}

async function mapConcurrent<T, U>(
  values: readonly T[],
  concurrency: number,
  map: (value: T) => Promise<U>,
): Promise<U[]> {
  const results = new Array<U>(values.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      const value = values[index];
      if (value !== undefined) results[index] = await map(value);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () =>
      worker(),
    ),
  );
  return results;
}
