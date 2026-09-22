import type { PostContent } from "@riebeckite/core";
import type { SeoMetadata } from "@riebeckite/plugin-seo";
import {
  buildAbsoluteUrl as buildPluginAbsoluteUrl,
  buildArticleSeo as buildPluginArticleSeo,
  buildPostUrl as buildPluginPostUrl,
  buildWebsiteSeo as buildPluginWebsiteSeo,
  calculateReadingTime,
  getDescription,
  getEntryPublishedTime,
  getEntryUpdatedTime,
  getHtmlLanguage as getPluginHtmlLanguage,
} from "@riebeckite/plugin-seo";
import { config } from "../config";

const seoOptions = {
  siteName: config.site.title,
  defaultImage: config.site.defaultOgImage,
  feed: {
    rss: true,
    atom: true,
    json: true,
  },
  sitemap: true,
  robots: true,
};

export type { SeoMetadata } from "@riebeckite/plugin-seo";
export {
  calculateReadingTime,
  getDescription,
  getEntryPublishedTime,
  getEntryUpdatedTime,
};

export function buildArticleSeo(slug: string, post: PostContent): SeoMetadata {
  return buildPluginArticleSeo(config, seoOptions, slug, post);
}

export function buildIndexSeo(post?: PostContent): SeoMetadata {
  return buildWebsiteSeo({
    title: config.site.title,
    description: post ? getDescription(post) : config.site.description,
    path: "/",
    kind: "index",
  });
}

export function buildTagSeo(tag: string, path: string): SeoMetadata {
  return buildWebsiteSeo({
    title: `#${tag} | ${config.site.title}`,
    description: `${config.site.title} の #${tag} タグの記事一覧です。`,
    path,
    kind: "tag",
  });
}

export function buildWebsiteSeo(input: {
  title: string;
  description?: string;
  path: string;
  kind?: "index" | "tag" | "website";
}): SeoMetadata {
  return buildPluginWebsiteSeo(config, seoOptions, input);
}

export function buildAbsoluteUrl(pathOrUrl: string): string {
  return buildPluginAbsoluteUrl(config, pathOrUrl);
}

export function buildPostUrl(slug: string): string {
  return buildPluginPostUrl(config, slug);
}

export function getHtmlLanguage(): string {
  return getPluginHtmlLanguage(config);
}
