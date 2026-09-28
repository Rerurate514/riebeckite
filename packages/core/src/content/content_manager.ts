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
import type { PostContent } from "../types/post_content.js";
import type { ResolvedRiebeckiteConfig } from "../types/resolved_riebeckite_config.js";
import {
  type AffectedContent,
  determineAffectedContent,
} from "./affected_content.js";
import {
  CONTENT_BUILD_STATE_VERSION,
  type ContentBuildState,
  type FingerprintedContentEntry,
} from "./content_build_state.js";
import {
  loadContentBuildState,
  resolveContentBuildStatePath,
  saveContentBuildState,
} from "./content_build_state_store.js";
import {
  allContentChanged,
  type ContentChangeSet,
  diffContentEntries,
  hasContentChanges,
} from "./content_change_set.js";
import { fingerprintContentEntries } from "./content_fingerprint.js";
import type { ContentGraph } from "./content_graph.js";
import { ContentIndexBuilder } from "./content_index_builder.js";
import { resolveDefaultContentLocation } from "./content_location.js";
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

type ContentBuildPreparation = {
  previousState: ContentBuildState | undefined;
  currentEntries: readonly FingerprintedContentEntry[];
  changeSet: ContentChangeSet;
  affected: AffectedContent;
};

export class ContentManager {
  private source: ContentSource;
  private contentIndexBuilder: ContentIndexBuilder;
  private manifestBuilder = new ManifestBuilder();
  private pluginRuntime: PluginRuntime;
  private contentIndex: Map<string, string> | null = null;
  private contentCache = new Map<string, PostContent>();
  private contentEntries: readonly ContentSourceEntry[] | null = null;
  private contentTexts = new Map<string, Promise<string>>();
  private manifest: ContentManifest | null = null;
  private contentLocations: Map<string, ContentPublicLocation> | null = null;
  private pipeline: Pipeline | null = null;
  private buildPreparation: Promise<ContentBuildPreparation> | null = null;
  private buildStatePath: string;
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
          new FileSystemContentSource(content, exclude))
        : content;
    this.pipelineOptions = {
      ...this.pipelineOptions,
      contentSource: this.source,
    };
    this.contentIndexBuilder = new ContentIndexBuilder(this.source);
    this.pluginRuntime = new PluginRuntime(this.pipelineOptions);
    this.buildStatePath = resolveContentBuildStatePath(
      pipelineOptions.config,
      typeof content === "string" ? content : undefined,
    );
  }

  async getAllPosts(): Promise<ContentPostReference[]> {
    return (await this.scan())
      .filter((entry) => entry.path.endsWith(".md"))
      .map((entry) => ({ slug: entry.path.replace(/\.md$/, "") }));
  }

  /** Scans the configured content source without processing content. */
  async scan(): Promise<readonly ContentSourceEntry[]> {
    return await this.getContentEntries();
  }

  async getPost(slug: string): Promise<string> {
    return await this.readTextEntry(`${slug}.md`);
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
      await this.getContentEntries(),
      (entry) => this.readContentEntry(entry),
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
          await this.getPermalinks(),
          (postSlug) => this.getPost(postSlug),
          this.pipelineOptions,
          this.isBuildTime,
        );
        const content = await this.pipeline.execute(
          rawPost,
          0,
          new Set([slug]),
        );

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

    if (options) this.enableBuildTime();
    const preparation = options
      ? await this.getBuildPreparation(options)
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
        this.populateRedirects(manifest, locations);
        await this.pluginRuntime.runManifestCreated(manifest, contentIndex);

        manifest.assets = this.pluginRuntime.collectAssets();
        manifest.diagnostics = [
          ...this.pluginRuntime.getDiagnostics(),
          ...(await this.pluginRuntime.collectDiagnostics(contentIndex)),
        ];

        await this.pluginRuntime.runBuildEnd(manifest, contentIndex);
        if (preparation) await this.commitBuildState(preparation, manifest);
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

  /**
   * Inspects source entries and registered diagnostics without running build
   * lifecycle hooks, rendering content, or writing build state.
   */
  async inspect(): Promise<ContentInspection> {
    const [entries, contentIndex] = await Promise.all([
      this.getContentEntries(),
      this.getContentIndex(),
    ]);
    const diagnostics =
      await this.pluginRuntime.collectDiagnostics(contentIndex);

    return { entries, contentIndex, diagnostics };
  }

  async dispose(): Promise<void> {
    if (!this.contentIndex) return;
    await this.pluginRuntime.dispose(this.contentIndex);
  }

  private async getContentEntries(): Promise<readonly ContentSourceEntry[]> {
    this.contentEntries ??= await this.observability().tracer.span(
      "content.scan",
      {},
      () => this.source.scan(),
    );
    return this.contentEntries;
  }

  /**
   * Resolves the canonical public location for every Markdown entry, applying
   * plugin location resolvers. Reads frontmatter but does not render content or
   * write build state.
   */
  async getContentLocations(): Promise<
    ReadonlyMap<string, ContentPublicLocation>
  > {
    if (this.contentLocations) return this.contentLocations;
    const [entries, contentIndex] = await Promise.all([
      this.getContentEntries(),
      this.getContentIndex(),
    ]);
    await this.pluginRuntime.startBuild(contentIndex);
    const inputs = await Promise.all(
      entries
        .filter((entry) => entry.path.endsWith(".md"))
        .map(async (entry) => ({
          slug: toSlug(entry.path),
          path: entry.path,
          markdown: await this.readContentEntry(entry),
        })),
    );
    const locations = new Map(
      inputs.map((input) => [input.slug, resolveDefaultContentLocation(input)]),
    );
    for (const location of await this.pluginRuntime.resolveContentLocations(
      inputs,
      contentIndex,
    )) {
      if (!locations.has(location.slug)) {
        throw new Error(
          `Content public location references an unknown slug: ${location.slug}`,
        );
      }
      locations.set(location.slug, location);
    }
    this.contentLocations = locations;
    return locations;
  }

  private async getPermalinks(): Promise<Map<string, string>> {
    return new Map(
      Array.from(
        (await this.getContentLocations()).entries(),
        ([slug, location]) => [slug, location.permalink] as const,
      ),
    );
  }

  private populateRedirects(
    manifest: ContentManifest,
    locations: ReadonlyMap<string, ContentPublicLocation>,
  ): void {
    for (const [slug, location] of locations) {
      for (const redirect of location.redirects ?? []) {
        manifest.redirects.set(redirect.path, { ...redirect, slug });
      }
    }
  }

  private async readTextEntry(logicalPath: string): Promise<string> {
    const entries = await this.getContentEntries();
    const entry = entries.find((current) => current.path === logicalPath);
    if (!entry) throw new Error(`Content entry was not found: ${logicalPath}`);

    return await this.readContentEntry(entry);
  }

  private readContentEntry(entry: ContentSourceEntry): Promise<string> {
    const cached = this.contentTexts.get(entry.path);
    if (cached) return cached;

    const content = this.source
      .read(entry)
      .then((value) =>
        typeof value === "string" ? value : new TextDecoder().decode(value),
      );
    this.contentTexts.set(entry.path, content);
    return content;
  }

  private getBuildPreparation(
    options: ContentBuildOptions,
  ): Promise<ContentBuildPreparation> {
    this.buildPreparation ??= this.prepareBuild(options);
    return this.buildPreparation;
  }

  private enableBuildTime(): void {
    this.isBuildTime = true;
    this.pluginRuntime.enableBuildTime();
  }

  private async prepareBuild(
    options: ContentBuildOptions,
  ): Promise<ContentBuildPreparation> {
    const currentEntries = await fingerprintContentEntries(
      await this.getContentEntries(),
      (entry) => this.readContentEntry(entry),
    );
    const previousState =
      options.incremental === false
        ? undefined
        : await loadContentBuildState(this.buildStatePath);
    const changeSet = previousState
      ? diffContentEntries(previousState, currentEntries)
      : allContentChanged(currentEntries);

    const preparation = {
      previousState,
      currentEntries,
      changeSet,
      affected: determineAffectedContent(
        changeSet,
        previousState,
        currentEntries.map(({ entry }) => entry.path),
      ),
    };
    this.observability().tracer.event("build.incremental", {
      incremental: options.incremental !== false,
      added: changeSet.added.length,
      changed: changeSet.changed.length,
      removed: changeSet.removed.length,
      unchanged: changeSet.unchanged.length,
      affected:
        preparation.affected.direct.size + preparation.affected.dependent.size,
    });
    return preparation;
  }

  private async commitBuildState(
    preparation: ContentBuildPreparation,
    manifest: ContentManifest,
  ): Promise<void> {
    const entriesBySlug = new Map(
      manifest.entries.map((entry) => [entry.slug, entry]),
    );
    const state: ContentBuildState = {
      version: CONTENT_BUILD_STATE_VERSION,
      entries: Object.fromEntries(
        preparation.currentEntries.map(({ entry, fingerprint }) => {
          const manifestEntry = entriesBySlug.get(toSlug(entry.path));
          return [
            entry.path,
            {
              fingerprint,
              dependencies: manifestEntry
                ? manifestEntry.links
                    .filter(
                      (link): link is typeof link & { slug: string } =>
                        link.kind === "note" && link.slug !== null,
                    )
                    .map((link) => link.slug)
                    .sort()
                : [],
            },
          ];
        }),
      ),
      contentIndex: Object.fromEntries(
        [...manifest.contentIndex.entries()].sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
    };

    try {
      await saveContentBuildState(this.buildStatePath, state);
    } catch {
      // Build state is an optimization; the completed build remains valid.
    }
  }

  private observability(): Observability {
    return this.pipelineOptions.observability ?? noopObservability;
  }
}

function toSlug(path: string): string {
  return path.replace(/\.md$/, "");
}

declare module "../pipeline" {
  interface PipelineOptions {
    config?: ResolvedRiebeckiteConfig;
  }
}
