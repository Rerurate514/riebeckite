import type {
  PluginSeoExtension,
  PostContent,
  SeoMetadata,
} from "@riebeckite/core";
import { resolvePlugins } from "@riebeckite/core";
import { config } from "../config";

const seoProvider = findSeoProvider();

export type { SeoMetadata } from "@riebeckite/core";
export const calculateReadingTime = seoProvider.calculateReadingTime;
export const getDescription = seoProvider.getDescription;
export const getEntryPublishedTime = seoProvider.getEntryPublishedTime;
export const getEntryUpdatedTime = seoProvider.getEntryUpdatedTime;
export const renderAtomFeed = seoProvider.renderAtomFeed;
export const renderJsonFeed = seoProvider.renderJsonFeed;
export const renderRobots = seoProvider.renderRobots;
export const renderRssFeed = seoProvider.renderRssFeed;
export const renderSitemap = seoProvider.renderSitemap;

export function buildArticleSeo(slug: string, post: PostContent): SeoMetadata {
  return seoProvider.buildArticleSeo(config, slug, post);
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
  return seoProvider.buildWebsiteSeo(config, input);
}

export function buildAbsoluteUrl(pathOrUrl: string): string {
  return seoProvider.buildAbsoluteUrl(config, pathOrUrl);
}

export function buildPostUrl(slug: string): string {
  return seoProvider.buildPostUrl(config, slug);
}

export function getHtmlLanguage(): string {
  return seoProvider.getHtmlLanguage(config);
}

function findSeoProvider(): PluginSeoExtension {
  const provider = resolvePlugins(config.plugins).find(
    (plugin) => plugin.seo,
  )?.seo;
  if (!provider) {
    throw new Error("SEO plugin extension is not configured.");
  }

  return provider;
}
