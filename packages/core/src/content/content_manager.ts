import type { PipelineOptions } from "../pipeline";
import { Pipeline } from "../pipeline";
import { PluginRuntime } from "../plugin/plugin_runtime";
import type { ContentManifest } from "../types/content_manifest";
import type { Diagnostic } from "../types/diagnostic";
import type { PostContent } from "../types/post_content";
import type { ResolvedRiebeckiteConfig } from "../types/resolved_riebeckite_config";
import type { ContentGraph } from "./content_graph";
import { ContentIndexBuilder } from "./content_index_builder";
import {
  type ContentPostReference,
  ContentRepository,
} from "./content_repository";
import { ManifestBuilder } from "./manifest_builder";

export type Backlink = {
  slug: string;
};

export class ContentManager {
  private repository: ContentRepository;
  private contentIndexBuilder: ContentIndexBuilder;
  private manifestBuilder = new ManifestBuilder();
  private pluginRuntime: PluginRuntime;
  private contentIndex: Map<string, string> | null = null;
  private contentCache = new Map<string, PostContent>();
  private manifest: ContentManifest | null = null;
  private pipeline: Pipeline | null = null;

  constructor(
    contentDirectory: string,
    exclude: string[] = [],
    private pipelineOptions: PipelineOptions = {},
  ) {
    this.repository = new ContentRepository(contentDirectory, exclude);
    this.contentIndexBuilder = new ContentIndexBuilder(this.repository);
    this.pluginRuntime = new PluginRuntime(pipelineOptions);
  }

  async getAllPosts(): Promise<ContentPostReference[]> {
    return await this.repository.getAllPosts();
  }

  async getPost(slug: string): Promise<string> {
    return await this.repository.getPost(slug);
  }

  async getContentIndex(): Promise<Map<string, string>> {
    this.contentIndex ??= await this.contentIndexBuilder.build();
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

  async getManifest(): Promise<ContentManifest> {
    if (this.manifest) return this.manifest;

    const [posts, contentIndex] = await Promise.all([
      this.getAllPosts(),
      this.getContentIndex(),
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
    this.manifest = this.manifestBuilder.build(entries, contentIndex);
    await this.pluginRuntime.runManifestCreated(this.manifest, contentIndex);

    this.manifest.assets = this.pluginRuntime.collectAssets();
    this.manifest.diagnostics = [
      ...this.pluginRuntime.getDiagnostics(),
      ...(await this.pluginRuntime.collectDiagnostics(contentIndex)),
    ];

    await this.pluginRuntime.runBuildEnd(this.manifest, contentIndex);
    return this.manifest;
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
}

declare module "../pipeline" {
  interface PipelineOptions {
    config?: ResolvedRiebeckiteConfig;
  }
}
