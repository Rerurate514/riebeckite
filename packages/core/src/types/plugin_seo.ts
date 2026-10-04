import type { ContentManifestEntry } from "./content_manifest.js";
import type { PluginHeadTag } from "./plugin_head.js";
import type { PostContent } from "./post_content.js";
import type { ResolvedRiebeckiteConfig } from "./resolved_riebeckite_config.js";

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
    permalink: string,
    post: PostContent,
    headTags?: readonly PluginHeadTag[],
  ): SeoMetadata;
  buildWebsiteSeo(
    config: ResolvedRiebeckiteConfig,
    input: WebsiteSeoInput,
    headTags?: readonly PluginHeadTag[],
  ): SeoMetadata;
  buildAbsoluteUrl(config: ResolvedRiebeckiteConfig, pathOrUrl: string): string;
  buildPostUrl(config: ResolvedRiebeckiteConfig, permalink: string): string;
  getDescription(post: Pick<PostContent, "frontmatter" | "html">): string;
  getEntryPublishedTime(entry: ContentManifestEntry): string | null;
  getEntryUpdatedTime(entry: ContentManifestEntry): string | null;
  getHtmlLanguage(config: ResolvedRiebeckiteConfig): string;
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
