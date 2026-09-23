import type { Plugin } from "unified";
import type { Node } from "unist";
import type { ContentManifest, ContentManifestEntry } from "./content_manifest";
import type { Diagnostic } from "./diagnostic";
import type { PostContent } from "./post_content";
import type { ResolvedRiebeckiteConfig } from "./resolved_riebeckite_config";

export type PipelinePlugin = Plugin<[], Node, Node>;

export type {
  Diagnostic,
  DiagnosticCode,
  DiagnosticSeverity,
} from "./diagnostic";

export type PluginDiagnosticLevel = Diagnostic["severity"];

export type PluginDiagnostic = Diagnostic & { pluginName: string };

export type PluginAssetKind = "style" | "script";

export type PluginAsset = {
  pluginName: string;
  kind: PluginAssetKind;
  /**
   * ESM/CSS module specifier resolved by the host bundler.
   * Example: "@riebeckite/plugin-lightbox/style.css".
   */
  moduleSpecifier?: string;
  /** @deprecated Use moduleSpecifier. Kept for existing plugins. */
  path?: string;
};

export type PluginClientEntry = {
  pluginName: string;
  /** ESM module specifier resolved and bundled by the host bundler. */
  moduleSpecifier: string;
  /** Exported initializer name. Defaults to the module default export. */
  exportName?: string;
};

export type SeoMetadata = {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl: string;
  type: "website" | "article";
  noindex: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  tags: string[];
  readingTimeMinutes?: number;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

export type WebsiteSeoInput = {
  title: string;
  description?: string;
  path: string;
  kind?: "index" | "tag" | "article" | "website";
};

export type RenderableFeedEntry = ContentManifestEntry & {
  html?: string;
};

export type PluginSeoExtension = {
  buildArticleSeo(
    config: ResolvedRiebeckiteConfig,
    slug: string,
    post: PostContent,
  ): SeoMetadata;
  buildWebsiteSeo(
    config: ResolvedRiebeckiteConfig,
    input: WebsiteSeoInput,
  ): SeoMetadata;
  buildAbsoluteUrl(config: ResolvedRiebeckiteConfig, pathOrUrl: string): string;
  buildPostUrl(config: ResolvedRiebeckiteConfig, slug: string): string;
  getDescription(post: Pick<PostContent, "frontmatter" | "html">): string;
  getEntryPublishedTime(entry: ContentManifestEntry): string | null;
  getEntryUpdatedTime(entry: ContentManifestEntry): string | null;
  getHtmlLanguage(config: ResolvedRiebeckiteConfig): string;
  calculateReadingTime(html: string): number;
  renderSitemap(
    config: ResolvedRiebeckiteConfig,
    entries: ContentManifestEntry[],
  ): string;
  renderRobots(config: ResolvedRiebeckiteConfig): string;
  renderRssFeed(
    config: ResolvedRiebeckiteConfig,
    entries: RenderableFeedEntry[],
  ): string;
  renderAtomFeed(
    config: ResolvedRiebeckiteConfig,
    entries: RenderableFeedEntry[],
  ): string;
  renderJsonFeed(
    config: ResolvedRiebeckiteConfig,
    entries: RenderableFeedEntry[],
  ): string;
};

export type MarkdownPipeline = {
  use(plugin: PipelinePlugin, options?: unknown): void;
};

export type HtmlPipeline = MarkdownPipeline;

export type PluginContext = {
  config?: ResolvedRiebeckiteConfig;
  contentIndex: Map<string, string>;
  diagnostics: Diagnostic[];
};

export type PluginContentContext = PluginContext & {
  slug: string;
  markdown: string;
};

export type PluginPostContext = PluginContentContext & {
  content: PostContent;
};

export type PluginManifestContext = PluginContext & {
  manifest: ContentManifest;
};

export type PluginGraphContext = PluginContext & {
  entries: ContentManifestEntry[];
};

export type PluginAttachmentRenderContext = PluginContext & {
  path: string;
  raw: string;
  label: string;
  url: string;
  embed: boolean;
};

export type RiebeckitePlugin<TOptions = unknown> = {
  name: string;
  options?: TOptions;
  order?: number;
  enabled?: boolean;
  remarkPlugins?: PipelinePlugin[];
  rehypePlugins?: PipelinePlugin[];
  onConfigResolved?(context: PluginContext): void | Promise<void>;
  onContentLoaded?(context: PluginContentContext): void | Promise<void>;
  onPostParsed?(context: PluginPostContext): void | Promise<void>;
  onPostProcessed?(context: PluginPostContext): void | Promise<void>;
  onManifestCreated?(context: PluginManifestContext): void | Promise<void>;
  onBuildStart?(context: PluginContext): void | Promise<void>;
  onBuildEnd?(context: PluginManifestContext): void | Promise<void>;
  extendMarkdownPipeline?(pipeline: MarkdownPipeline): void;
  extendHtmlPipeline?(pipeline: HtmlPipeline): void;
  addDiagnostics?(context: PluginContext): Diagnostic[] | Promise<Diagnostic[]>;
  assets?: PluginAsset[];
  clientEntries?: PluginClientEntry[];
  seo?: PluginSeoExtension;
  injectAssets?(context: PluginContext): PluginAsset[];
  extendContentGraph?(context: PluginGraphContext): void | Promise<void>;
  renderAttachment?(
    context: PluginAttachmentRenderContext,
  ): string | null | Promise<string | null>;
};

export type PluginInput = RiebeckitePlugin | false | null | undefined;

export function definePlugin<TOptions>(
  plugin: RiebeckitePlugin<TOptions>,
): RiebeckitePlugin<TOptions> {
  return plugin;
}

export function resolvePlugins(
  plugins: PluginInput[] = [],
): RiebeckitePlugin[] {
  return plugins
    .filter((plugin): plugin is RiebeckitePlugin => Boolean(plugin))
    .filter((plugin) => plugin.enabled !== false)
    .toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
