import type { Observability } from "../observability.js";
import { noopObservability } from "../observability.js";
import type { PipelineOptions } from "../pipeline.js";
import { Pipeline } from "../pipeline.js";
import { PluginRuntime } from "../plugin/plugin_runtime.js";
import type {
  ContentManifest,
  ContentPublicLocation,
} from "../types/content_manifest.js";
import type { Diagnostic } from "../types/diagnostic.js";
import type { ResolvedPluginPage } from "../types/plugin_page.js";
import type { PostContent } from "../types/post_content.js";
import { isPublishable } from "../types/publish_strategy.js";
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
import type { ContentSource, ContentSourceEntry } from "./content_source.js";
import { FileSystemContentSource } from "./file_system_content_source.js";
import { ManifestBuilder } from "./manifest_builder.js";

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

export class ContentManager {
  private source: ContentSource;
  private contentIndexBuilder: ContentIndexBuilder;
  private manifestBuilder = new ManifestBuilder();
  private pluginRuntime: PluginRuntime;
  private contentIndex: Map<string, string> | null = null;
  private contentCache = new Map<string, PostContent>();
  private manifest: ContentManifest | null = null;
  private pipeline: Pipeline | null = null;
  private entryReader: ContentEntryReader;
  private locationResolver: ContentLocationResolver;
  private buildCoordinator: ContentBuildCoordinator;
  private isBuildTime = false;

  constructor(
    content: string | ContentSource,
    exclude: string[] = [],
    private pipelineOptions: PipelineOptions = {},
  ) {
    this.pipelineOptions = {
      ...pipelineOptions,
      plugins: pipelineOptions.plugins ?? pipelineOptions.config?.plugins,
    };
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

    this.contentIndex = await this.contentIndexBuilder.build(
      await this.entryReader.getEntries(),
      (entry) => this.entryReader.read(entry),
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

    // Plugin caches (and pipeline caches) must be usable whenever a manifest is
    // built, not only for explicit incremental builds: the SSG pass builds its
    // own ContentManager and relies on persisted plugin state (e.g. rename
    // detection) without requesting an incremental build. The incremental
    // coordinator still runs only when build options are supplied.
    this.enableBuildTime();

    const preparation = options
      ? await this.buildCoordinator.getPreparation(options.incremental)
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
        const entries = await Promise.all(
          posts.map(async (post) => {
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
            );
          }),
        );

        await this.pluginRuntime.runGraphHook(entries, contentIndex);
        const manifest = await this.observability().tracer.span(
          "content.graph",
          {},
          () => this.manifestBuilder.build(entries, contentIndex),
        );
        this.locationResolver.populateRedirects(manifest, locations);
        await this.pluginRuntime.runManifestCreated(manifest, contentIndex);

        this.applyPublicView(manifest);
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
        if (preparation)
          await this.buildCoordinator.commit(preparation, manifest);
        this.manifest = manifest;
        return manifest;
      },
    );
  }

  async build(options: ContentBuildOptions = {}): Promise<ContentManifest> {
    return await this.getManifest(options);
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
    const strategy =
      this.pipelineOptions.config?.content.filters.publishStrategy ??
      "explicit";
    manifest.publicEntries = manifest.entries.filter((entry) =>
      isPublishable(strategy, entry.frontmatter),
    );

    const publicSlugs = new Set(
      manifest.publicEntries.map((entry) => entry.slug),
    );
    manifest.publicRedirects = new Map(
      [...manifest.redirects].filter(([, redirect]) =>
        publicSlugs.has(redirect.slug),
      ),
    );
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
  }
}
