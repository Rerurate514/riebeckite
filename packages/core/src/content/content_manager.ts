import { VFile } from "vfile";
import { matter } from "vfile-matter";
import type { Observability } from "../observability.js";
import { noopObservability } from "../observability.js";
import type { PipelineOptions } from "../pipeline.js";
import { Pipeline } from "../pipeline.js";
import type { ManifestHookMetrics } from "../plugin/plugin_runtime.js";
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
import { mapConcurrent } from "../utils/concurrency.js";
import { attachErrorPath } from "../utils/error.js";
import { isImagePath, normalizeContentPath } from "./attachment.js";
import { ContentBuildCoordinator } from "./content_build_coordinator.js";
import {
  type ContentBuildPlan,
  reusableOutputChangeSet,
} from "./content_build_plan.js";
import { CONTENT_BUILD_STATE_EXCLUDE } from "./content_build_state.js";
import { resolveContentBuildStatePath } from "./content_build_state_store.js";
import type { CachedContentDependency } from "./content_dependency_tracker.js";
import { ContentEntryReader } from "./content_entry_reader.js";
import type { ContentGraph } from "./content_graph.js";
import {
  type ContentIndexBuild,
  ContentIndexBuilder,
} from "./content_index_builder.js";
import { ContentLocationResolver } from "./content_location_resolver.js";
import { reuseManifestEntry } from "./content_manifest_reuse.js";
import {
  computeContentCacheFingerprint,
  computeContentScopeFingerprint,
  computePipelineFingerprint,
  hasGlobalContentDependency,
  isPersistentlyCacheable,
  requiresFullContentRegeneration as requiresFullContentRegenerationForConfig,
} from "./content_persistent_cache.js";
import type { ContentSource, ContentSourceEntry } from "./content_source.js";
import { FileSystemContentSource } from "./file_system_content_source.js";
import { ManifestAssembler } from "./manifest_assembler.js";
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
  private manifestAssembler: ManifestAssembler;
  private pluginRuntime: PluginRuntime;
  private contentIndex: Map<string, string> | null = null;
  private contentIndexAmbiguities: ReadonlyMap<string, readonly string[]> =
    new Map();
  private contentIndexPromise: Promise<ContentIndexBuild> | null = null;
  private contentCache = new Map<string, PostContent>();
  private manifest: ContentManifest | null = null;
  private manifestPromise: Promise<ContentManifest> | null = null;
  private pipelineFingerprint: string | null = null;
  private pipeline: Pipeline | null = null;
  private entryReader: ContentEntryReader;
  private locationResolver: ContentLocationResolver;
  private buildCoordinator: ContentBuildCoordinator;
  private isBuildTime = false;
  private publishingBuildTime: Date;
  private routableSlugs: Set<string> | null = null;
  private routableSlugsPromise: Promise<Set<string>> | null = null;
  private processedContentCount = 0;
  private reusedContentCount = 0;
  private outputChangeSet: OutputChangeSet | null = null;
  private buildPlan: Promise<ContentBuildPlan> | null = null;
  private buildStateCommitRequested = false;
  private buildStateCommitted = false;
  private cacheManifestEntries: readonly ContentManifestEntry[] = [];
  private trackedContentDependencies = new Map<
    string,
    readonly CachedContentDependency[]
  >();
  private processedContentCacheFingerprints = new Map<
    string,
    string | undefined
  >();

  constructor(
    content: string | ContentSource,
    exclude: string[] = [],
    private pipelineOptions: PipelineOptions = {},
  ) {
    const config = pipelineOptions.config
      ? {
          ...pipelineOptions.config,
          plugins: pipelineOptions.plugins ?? pipelineOptions.config.plugins,
        }
      : undefined;
    this.pipelineOptions = {
      ...pipelineOptions,
      config,
      plugins: pipelineOptions.plugins ?? config?.plugins,
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
      onContentDependencies: (slug, dependencies) => {
        this.trackedContentDependencies.set(slug, dependencies);
      },
    };
    this.contentIndexBuilder = new ContentIndexBuilder(this.source);
    this.manifestAssembler = new ManifestAssembler(this.contentCache);
    this.pluginRuntime = new PluginRuntime(this.pipelineOptions);
    this.pluginRuntime.setPageMarkdownRenderer(async (markdown) => {
      if (!this.pipeline) {
        throw new Error("Markdown pipeline is unavailable for plugin pages.");
      }
      return (await this.pipeline.execute(markdown)).html;
    });
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
      includeFileMetadata:
        this.pipelineOptions.plugins?.some(
          (plugin) => plugin && plugin.contentFileMetadata === true,
        ) ?? false,
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

  async getContentIndex(plan?: ContentBuildPlan): Promise<Map<string, string>> {
    if (this.contentIndex) return this.contentIndex;
    if (!plan && this.contentIndexPromise)
      return (await this.contentIndexPromise).index;

    if (plan) {
      this.contentIndex = plan.currentContentIndex;
      this.contentIndexAmbiguities = plan.currentContentIndexAmbiguities;
      return this.contentIndex;
    }

    const promise = this.observability().tracer.span(
      "content.index",
      {},
      async () =>
        await this.contentIndexBuilder.build(
          await this.entryReader.getEntries(),
          (entry) => this.entryReader.read(entry),
        ),
    );
    if (!plan) this.contentIndexPromise = promise;
    try {
      const built = await promise;
      this.contentIndex = built.index;
      this.contentIndexAmbiguities = built.ambiguities;
      return this.contentIndex;
    } finally {
      if (!plan) this.contentIndexPromise = null;
    }
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
        try {
          return await this.processContent(slug);
        } catch (error) {
          throw attachErrorPath(error, `${slug}.md`);
        }
      },
    );
  }

  private async processContent(slug: string): Promise<PostContent> {
    const [contentIndex, rawPost] = await Promise.all([
      this.getContentIndex(),
      this.getPost(slug),
    ]);
    this.getProcessedContentCacheFingerprint(slug, rawPost);

    await this.pluginRuntime.startBuild(contentIndex);
    await this.pluginRuntime.runContentLoaded(slug, rawPost, contentIndex);

    await this.ensureRoutableSlugs();
    const locations = await this.getContentLocations();
    if (this.pipelineOptions.config) {
      this.pipelineFingerprint = this.computePipelineFingerprint(locations);
    }
    this.pipeline ??= new Pipeline(
      contentIndex,
      new Map(
        [...locations.entries()].map(([locationSlug, location]) => [
          locationSlug,
          location.permalink,
        ]),
      ),
      (postSlug) => this.getPost(postSlug),
      {
        ...this.pipelineOptions,
        contentScopeFingerprint: this.pipelineFingerprint ?? undefined,
      },
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
  }

  async getManifest(options?: ContentBuildOptions): Promise<ContentManifest> {
    this.requestBuildStateCommit(options);
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

    this.enableBuildTime();

    const config = this.pipelineOptions.config;
    const plan = await this.getBuildPlan(options);
    const locations = await this.getContentLocations();
    if (config) {
      this.pipelineFingerprint = this.computePipelineFingerprint(locations);
    }

    return await this.observability().tracer.span(
      "content.manifest",
      {},
      async () => {
        const [posts, contentIndex] = await Promise.all([
          this.getAllPosts(),
          this.getContentIndex(plan),
        ]);
        const entriesByPath = new Map(
          (await this.scan()).map((entry) => [entry.path, entry]),
        );
        const entries = await this.observability().tracer.span(
          "content.manifest.entries",
          {},
          () =>
            mapConcurrent(
              posts,
              CONTENT_PROCESSING_CONCURRENCY,
              async (post) => {
                const rawPost = await this.getPost(post.slug);
                const reused = this.reuseManifestEntry(
                  post.slug,
                  rawPost,
                  plan,
                );
                if (reused) return reused;

                const processed = await this.getProcessedContent(post.slug);
                const location = locations.get(post.slug);
                if (!location) {
                  throw new Error(
                    `Content public location was not resolved: ${post.slug}`,
                  );
                }

                return this.manifestAssembler.createEntry(
                  post.slug,
                  rawPost,
                  processed,
                  contentIndex,
                  location,
                  resolvePublishingState(processed.frontmatter, {
                    strategy: this.publishStrategy(),
                    buildTime: this.publishingBuildTime,
                  }),
                  entriesByPath.get(`${post.slug}.md`)?.metadata,
                );
              },
            ),
        );

        await this.pluginRuntime.runGraphHook(entries, contentIndex);
        const manifest = await this.observability().tracer.span(
          "content.graph",
          {},
          () =>
            this.manifestAssembler.build(
              entries,
              contentIndex,
              this.contentIndexAmbiguities,
            ),
        );
        const cacheManifestEntries = structuredClone(manifest.entries);
        this.locationResolver.populateRedirects(manifest, locations);
        this.manifestAssembler.applyPublicView(
          manifest,
          this.publishStrategy(),
          this.publishingBuildTime,
        );
        manifest.pagePaths = [
          ...(await this.pluginRuntime.getPagePaths(manifest, contentIndex)),
        ];
        manifest.pageRoutes = [
          ...(await this.pluginRuntime.getPageRoutes(manifest, contentIndex)),
        ];
        await this.pluginRuntime.runAssetTransforms(manifest);
        await this.pluginRuntime.runManifestCreated(
          manifest,
          contentIndex,
          plan.previousState?.manifestHookCache,
          this.getPipelineFingerprint(),
        );
        this.manifestAssembler.synchronizeHtml(manifest, cacheManifestEntries);
        manifest.assets = this.pluginRuntime.collectAssets();
        manifest.clientEntries = this.pluginRuntime.collectClientEntries();
        manifest.diagnostics = [
          ...this.pluginRuntime.getDiagnostics(),
          ...(await this.pluginRuntime.collectDiagnostics(contentIndex)),
        ];

        await this.pluginRuntime.runGeneratedOutputPlans(manifest);
        await this.pluginRuntime.runBuildEnd(manifest, contentIndex);
        await this.emitPublicImageAssets(manifest);
        manifest.generatedOutputs =
          this.pluginRuntime.collectGeneratedOutputs();
        const pluginPageOutputs = await this.observability().tracer.span(
          "output.dependencies.plugin",
          {},
          () => this.pluginRuntime.getPageOutputs(manifest, contentIndex),
        );
        this.outputChangeSet = await this.observability().tracer.span(
          "output.dependencies.resolve",
          {},
          () =>
            determineOutputChanges({
              manifest,
              previousState: plan.previousState,
              changeSet: plan.changeSet,
              affectedContent: plan.affectedContent,
              pluginPageOutputs,
              contentOutputDependencies:
                this.pluginRuntime.getContentOutputDependencies(),
              externalDependencies: plan.externalDependencies,
              externalDependencyFailures: plan.externalDependencyFailures,
              contentFingerprints: this.processedContentCacheFingerprints,
            }),
        );
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
        this.manifest = manifest;
        this.cacheManifestEntries = cacheManifestEntries;
        await this.commitBuildState();
        return manifest;
      },
    );
  }

  async build(options: ContentBuildOptions = {}): Promise<ContentManifest> {
    return await this.getManifest(options);
  }

  getProcessedContentCount(): number {
    return this.processedContentCount;
  }

  getReusedContentCount(): number {
    return this.reusedContentCount;
  }

  getManifestHookMetrics(): ManifestHookMetrics {
    return this.pluginRuntime.getManifestHookMetrics();
  }

  async getNoChangeFastPathBlockReason(
    options: ContentBuildOptions = {},
  ): Promise<string | undefined> {
    const plan = await this.getBuildPlan(options);
    if (plan.fullRegenerationReasons.includes("publishing-state-expired"))
      return "publishing-state-expired";
    if (
      plan.reusableOutputs?.some((output) =>
        output.dependencies.some((dependency) => dependency.type === "unknown"),
      )
    )
      return "output-dependency-unknown";
    return this.pluginRuntime.getNoChangeFastPathBlockReason(
      plan.previousState?.manifestHookCache ?? [],
      this.getPipelineFingerprint(),
    );
  }

  async getOutputChangeSet(
    options: ContentBuildOptions = {},
  ): Promise<OutputChangeSet> {
    this.requestBuildStateCommit(options);
    if (this.outputChangeSet) {
      await this.commitBuildState();
      return this.outputChangeSet;
    }

    const plan = await this.getBuildPlan(options);
    if (plan.reusableOutputs) {
      this.outputChangeSet = await this.observability().tracer.span(
        "output.dependencies.reuse",
        { outputCount: plan.reusableOutputs.length },
        async () => reusableOutputChangeSet(plan.reusableOutputs ?? []),
      );
      return this.outputChangeSet;
    }

    await this.observability().tracer.span(
      "output.dependencies.manifest",
      {},
      () => this.getManifest(options),
    );
    if (!this.outputChangeSet) {
      const manifest = await this.getManifest();
      const contentIndex = await this.getContentIndex();
      const pluginPageOutputs = await this.observability().tracer.span(
        "output.dependencies.plugin",
        {},
        () => this.pluginRuntime.getPageOutputs(manifest, contentIndex),
      );
      return await this.observability().tracer.span(
        "output.dependencies.resolve",
        {},
        () =>
          determineOutputChanges({
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
            contentOutputDependencies:
              this.pluginRuntime.getContentOutputDependencies(),
            externalDependencies: plan.externalDependencies,
            externalDependencyFailures: plan.externalDependencyFailures,
          }),
      );
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
      this.getManifest({ incremental: false }),
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
    this.entryReader.clearReadCache();
    if (!this.contentIndex) return;
    await this.pluginRuntime.dispose(this.contentIndex);
  }

  async getContentLocations(): Promise<
    ReadonlyMap<string, ContentPublicLocation>
  > {
    return await this.locationResolver.getLocations();
  }

  private publishStrategy(): PublishStrategy {
    return (
      this.pipelineOptions.config?.content.filters.publishStrategy ?? "explicit"
    );
  }

  private reuseManifestEntry(
    slug: string,
    source: string,
    plan: ContentBuildPlan,
  ): ContentManifestEntry | null {
    const reused = reuseManifestEntry({
      slug,
      plan,
      pipelineFingerprint: this.getPipelineFingerprint(),
      getContentCacheFingerprint: () =>
        this.getProcessedContentCacheFingerprint(slug, source),
    });
    if (!reused) return null;
    this.reusedContentCount += 1;
    this.processedContentCacheFingerprints.set(
      slug,
      reused.contentCacheFingerprint,
    );
    this.observability().tracer.event("content.reuse", { slug });
    return reused.entry;
  }

  private getPipelineFingerprint(): string | undefined {
    if (!this.pipelineOptions.config) return undefined;
    this.pipelineFingerprint ??= this.computePipelineFingerprint();
    return this.pipelineFingerprint;
  }

  private requestBuildStateCommit(options?: ContentBuildOptions): void {
    if (this.pipelineOptions.commitBuildState === false) return;
    if (options?.incremental !== false) this.buildStateCommitRequested = true;
  }

  private async commitBuildState(): Promise<void> {
    if (
      this.buildStateCommitted ||
      !this.buildStateCommitRequested ||
      !this.manifest ||
      !this.outputChangeSet
    ) {
      return;
    }
    const manifest = this.manifest;
    const outputChangeSet = this.outputChangeSet;
    const plan = await this.getBuildPlan();
    if (!plan.incremental) return;
    await this.observability().tracer.span("content.build-state.save", {}, () =>
      this.buildCoordinator.commit(
        plan,
        manifest,
        this.getPipelineFingerprint(),
        [...outputChangeSet.affected, ...outputChangeSet.unchanged],
        this.cacheManifestEntries,
        this.trackedContentDependencies,
        plan.externalDependencies,
        this.processedContentCacheFingerprints,
        this.pluginRuntime.getManifestHookCache(),
        this.publishingBuildTime,
      ),
    );
    this.buildStateCommitted = true;
  }

  private getBuildPlan(
    options?: ContentBuildOptions,
  ): Promise<ContentBuildPlan> {
    if (this.buildPlan) return this.buildPlan;

    const plan = this.createBuildPlan(options);
    this.buildPlan = plan;
    void plan.catch(() => {
      if (this.buildPlan === plan) this.buildPlan = null;
    });
    return plan;
  }

  private async createBuildPlan(
    options?: ContentBuildOptions,
  ): Promise<ContentBuildPlan> {
    this.enableBuildTime();
    const config = this.pipelineOptions.config;
    if (config && hasGlobalContentDependency(config)) {
      this.pipelineFingerprint = this.computePipelineFingerprint(
        await this.getContentLocations(),
      );
    }
    const contentIndex = await this.getContentIndex();
    const external = await this.observability().tracer.span(
      "external.dependencies.resolve",
      {},
      () => this.pluginRuntime.resolveExternalDependencies(contentIndex),
    );
    return this.buildCoordinator.getPlan(
      options?.incremental !== false,
      this.getPipelineFingerprint(),
      this.requiresFullContentRegeneration(),
      external.snapshots,
      external.failures,
      this.publishingBuildTime,
    );
  }

  private computePipelineFingerprint(
    locations?: ReadonlyMap<string, ContentPublicLocation>,
  ): string {
    const config = this.pipelineOptions.config;
    if (!config) return "";
    const contentScopeFingerprint =
      locations && hasGlobalContentDependency(config)
        ? computeContentScopeFingerprint(locations)
        : undefined;
    return computePipelineFingerprint(config, contentScopeFingerprint);
  }

  private requiresFullContentRegeneration(): boolean {
    const config = this.pipelineOptions.config;
    return config ? requiresFullContentRegenerationForConfig(config) : false;
  }

  private getProcessedContentCacheFingerprint(
    slug: string,
    source: string,
  ): string | undefined {
    const config = this.pipelineOptions.config;
    if (!config || !isPersistentlyCacheable(slug, config, source).cacheable) {
      this.processedContentCacheFingerprints.set(slug, undefined);
      return undefined;
    }
    const fingerprint = computeContentCacheFingerprint(slug, source, config);
    this.processedContentCacheFingerprints.set(slug, fingerprint);
    return fingerprint;
  }

  private isRoutable(slug: string): boolean {
    if (!this.routableSlugs) {
      throw new Error(`Publishing state was not resolved: ${slug}`);
    }
    return this.routableSlugs.has(slug);
  }

  private async ensureRoutableSlugs(): Promise<Set<string>> {
    if (this.routableSlugs) return this.routableSlugs;
    if (this.routableSlugsPromise) return await this.routableSlugsPromise;

    this.routableSlugsPromise = this.resolveRoutableSlugs();
    try {
      this.routableSlugs = await this.routableSlugsPromise;
      return this.routableSlugs;
    } finally {
      this.routableSlugsPromise = null;
    }
  }

  private async resolveRoutableSlugs(): Promise<Set<string>> {
    const strategy = this.publishStrategy();
    const posts = await this.getAllPosts();
    const routableSlugs = new Set<string>();
    await mapConcurrent(posts, CONTENT_PROCESSING_CONCURRENCY, async (post) => {
      const markdown = await this.getPost(post.slug);
      let frontmatter: PostFrontmatter;
      try {
        frontmatter = readFrontmatter(markdown);
      } catch (error) {
        throw attachErrorPath(error, `${post.slug}.md`);
      }
      const publishing = resolvePublishingState(frontmatter, {
        strategy,
        buildTime: this.publishingBuildTime,
      });
      if (publishing.routable) routableSlugs.add(post.slug);
    });
    return routableSlugs;
  }

  private enableBuildTime(): void {
    this.isBuildTime = true;
    this.pluginRuntime.enableBuildTime();
  }

  private async emitPublicImageAssets(
    manifest: ContentManifest,
  ): Promise<void> {
    const imagePaths = new Set(
      manifest.publicEntries.flatMap((entry) =>
        entry.assets
          .filter((asset) => asset.sourcePath === undefined)
          .map((asset) => normalizeContentPath(asset.path))
          .filter(isImagePath),
      ),
    );
    const entriesByPath = new Map(
      (await this.source.scan()).map((entry) => [entry.path, entry]),
    );
    for (const path of imagePaths) {
      const entry = entriesByPath.get(path);
      if (entry)
        this.pluginRuntime.emitCoreAsset(path, await this.source.read(entry));
    }
  }

  private observability(): Observability {
    return this.pipelineOptions.observability ?? noopObservability;
  }
}

declare module "../pipeline" {
  interface PipelineOptions {
    config?: ResolvedRiebeckiteConfig;
    publishingBuildTime?: Date | string;
    commitBuildState?: boolean;
  }
}

function readFrontmatter(markdown: string): PostFrontmatter {
  const file = new VFile({ value: markdown });
  matter(file);
  return (file.data.matter ?? {}) as PostFrontmatter;
}
