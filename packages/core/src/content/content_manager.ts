import type { PipelineOptions } from "../pipeline";
import { Pipeline } from "../pipeline";
import { PluginRuntime } from "../plugin/plugin_runtime";
import type { ContentManifest } from "../types/content_manifest";
import type { Diagnostic } from "../types/diagnostic";
import type { PostContent } from "../types/post_content";
import type { ResolvedRiebeckiteConfig } from "../types/resolved_riebeckite_config";
import type { ContentGraph } from "./content_graph";
import {
  determineAffectedContent,
  type AffectedContent,
} from "./affected_content";
import {
  CONTENT_BUILD_STATE_VERSION,
  type ContentBuildState,
  type FingerprintedContentEntry,
} from "./content_build_state";
import {
  allContentChanged,
  diffContentEntries,
  hasContentChanges,
  type ContentChangeSet,
} from "./content_change_set";
import {
  loadContentBuildState,
  resolveContentBuildStatePath,
  saveContentBuildState,
} from "./content_build_state_store";
import { fingerprintContentEntries } from "./content_fingerprint";
import { ContentIndexBuilder } from "./content_index_builder";
import type { ContentSource, ContentSourceEntry } from "./content_source";
import { FileSystemContentSource } from "./file_system_content_source";
import { ManifestBuilder } from "./manifest_builder";

export type Backlink = {
  slug: string;
};

export type ContentPostReference = {
  slug: string;
};

export type ContentBuildOptions = {
  incremental?: boolean;
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
  private pipeline: Pipeline | null = null;
  private buildPreparation: Promise<ContentBuildPreparation> | null = null;
  private buildStatePath: string;
  private isBuildTime = false;

  constructor(
    content: string | ContentSource,
    exclude: string[] = [],
    private pipelineOptions: PipelineOptions = {},
  ) {
    this.source =
      typeof content === "string"
        ? (pipelineOptions.config?.content.source ??
          new FileSystemContentSource(content, exclude))
        : content;
    this.contentIndexBuilder = new ContentIndexBuilder(this.source);
    this.pluginRuntime = new PluginRuntime(pipelineOptions);
    this.buildStatePath = resolveContentBuildStatePath(
      pipelineOptions.config,
      typeof content === "string" ? content : undefined,
    );
  }

  async getAllPosts(): Promise<ContentPostReference[]> {
    return (await this.getContentEntries())
      .filter((entry) => entry.path.endsWith(".md"))
      .map((entry) => ({ slug: entry.path.replace(/\.md$/, "") }));
  }

  async getPost(slug: string): Promise<string> {
    return await this.readTextEntry(`${slug}.md`);
  }

  async getContentIndex(
    preparation?: ContentBuildPreparation,
  ): Promise<Map<string, string>> {
    if (this.contentIndex) return this.contentIndex;

    if (preparation?.previousState && !hasContentChanges(preparation.changeSet)) {
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

    const [contentIndex, rawPost] = await Promise.all([
      this.getContentIndex(),
      this.getPost(slug),
    ]);

    await this.pluginRuntime.startBuild(contentIndex);
    await this.pluginRuntime.runContentLoaded(slug, rawPost, contentIndex);

    this.pipeline ??= new Pipeline(
      contentIndex,
      (postSlug) => this.getPost(postSlug),
      this.pipelineOptions,
      this.isBuildTime,
    );
    const content = await this.pipeline.execute(rawPost, 0, new Set([slug]));

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
    if (this.manifest) return this.manifest;

    if (options) this.enableBuildTime();
    const preparation = options
      ? await this.getBuildPreparation(options)
      : undefined;
    const [posts, contentIndex] = await Promise.all([
      this.getAllPosts(),
      this.getContentIndex(preparation),
    ]);
    const entries = await Promise.all(
      posts.map(async (post) => {
        const [rawPost, processed] = await Promise.all([
          this.getPost(post.slug),
          this.getProcessedContent(post.slug),
        ]);

        return this.manifestBuilder.createEntry(
          post.slug,
          rawPost,
          processed,
          contentIndex,
        );
      }),
    );

    await this.pluginRuntime.runGraphHook(entries, contentIndex);
    const manifest = this.manifestBuilder.build(entries, contentIndex);
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
  }

  async build(
    options: ContentBuildOptions = {},
  ): Promise<ContentManifest> {
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

  async dispose(): Promise<void> {
    if (!this.contentIndex) return;
    await this.pluginRuntime.dispose(this.contentIndex);
  }

  private async getContentEntries(): Promise<readonly ContentSourceEntry[]> {
    this.contentEntries ??= await this.source.scan();
    return this.contentEntries;
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
    const previousState = options.incremental === false
      ? undefined
      : await loadContentBuildState(this.buildStatePath);
    const changeSet = previousState
      ? diffContentEntries(previousState, currentEntries)
      : allContentChanged(currentEntries);

    return {
      previousState,
      currentEntries,
      changeSet,
      affected: determineAffectedContent(
        changeSet,
        previousState,
        currentEntries.map(({ entry }) => entry.path),
      ),
    };
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
}

function toSlug(path: string): string {
  return path.replace(/\.md$/, "");
}

declare module "../pipeline" {
  interface PipelineOptions {
    config?: ResolvedRiebeckiteConfig;
  }
}
