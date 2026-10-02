import type { ContentManifestEntry } from "@riebeckite/core";

export type FeedOptions = {
  rss?: boolean;
  atom?: boolean;
  json?: boolean;
  limit?: number;
};

export type SeoPluginOptions = {
  siteName?: string;
  defaultImage?: string;
  feed?: FeedOptions;
  sitemap?: boolean;
  robots?: boolean;
};

export type RenderableFeedEntry = ContentManifestEntry & {
  html?: string;
};
