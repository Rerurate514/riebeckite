import type { ContentManifestEntry } from "./content_manifest";
import type { PostContent } from "./post_content";
import type { ResolvedRiebeckiteConfig } from "./resolved_riebeckite_config";

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
