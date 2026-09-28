import type { PipelineOptions } from "../pipeline";
import { Pipeline } from "../pipeline";
import { PluginRuntime } from "../plugin/plugin_runtime";
import type { ContentManifest } from "../types/content_manifest";
import type { Diagnostic } from "../types/diagnostic";
import type { PostContent } from "../types/post_content";
import type { ResolvedRiebeckiteConfig } from "../types/resolved_riebeckite_config";
import type { ContentGraph } from "./content_graph";
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

export class ContentManager {
  private source: ContentSource;
  private contentIndexBuilder: ContentIndexBuilder;
  private manifestBuilder = new ManifestBuilder();
  private pluginRuntime: PluginRuntime;
  private contentIndex: Map<string, string> | null = null;
  private contentCache = new Map<string, PostContent>();
  private contentEntries: readonly ContentSourceEntry[] | null = null;
  private manifest: ContentManifest | null = null;
  private pipeline: Pipeline | null = null;

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
  }

  async getAllPosts(): Promise<ContentPostReference[]> {
    return (await this.getContentEntries())
      .filter((entry) => entry.path.endsWith(".md"))
      .map((entry) => ({ slug: entry.path.replace(/\.md$/, "") }));
  }

  async getPost(slug: string): Promise<string> {
    return await this.readTextEntry(`${slug}.md`);
  }

  async getContentIndex(): Promise<Map<string, string>> {
    this.contentIndex ??= await this.contentIndexBuilder.build(
      await this.getContentEntries(),
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

    const content = await this.source.read(entry);
    return typeof content === "string"
      ? content
      : new TextDecoder().decode(content);
  }
}

declare module "../pipeline" {
  interface PipelineOptions {
    config?: ResolvedRiebeckiteConfig;
  }
}
