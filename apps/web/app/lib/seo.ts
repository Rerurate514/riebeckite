import type {
  PluginHeadTag,
  PluginSeoExtension,
  PostContent,
  SeoMetadata,
} from "@riebeckite/core";
import { resolvePlugins } from "@riebeckite/core";
import { config } from "../config";
import { buildArchiveDescription, buildTagDescription } from "./locale";

const seoProvider = findSeoProvider();

export type { SeoMetadata } from "@riebeckite/core";
export const getDescription = seoProvider.getDescription;
export const getEntryPublishedTime = seoProvider.getEntryPublishedTime;
export const getEntryUpdatedTime = seoProvider.getEntryUpdatedTime;
export const renderAtomFeed = seoProvider.renderAtomFeed;
export const renderJsonFeed = seoProvider.renderJsonFeed;
export const renderRobots = seoProvider.renderRobots;
export const renderRssFeed = seoProvider.renderRssFeed;
export const renderSitemap = seoProvider.renderSitemap;

export function buildArticleSeo(
  permalink: string,
  post: PostContent,
  headTags?: readonly PluginHeadTag[],
): SeoMetadata {
  return seoProvider.buildArticleSeo(config, permalink, post, headTags);
}

export function buildIndexSeo(
  post?: PostContent,
  headTags?: readonly PluginHeadTag[],
): SeoMetadata {
  return buildWebsiteSeo(
    {
      title: config.site.title,
      description: post ? getDescription(post) : config.site.description,
      path: "/",
      kind: "index",
    },
    headTags,
  );
}

export function buildTagSeo(
  tag: string,
  path: string,
  lang: string,
): SeoMetadata {
  return buildWebsiteSeo({
    title: `#${tag} | ${config.site.title}`,
    description: buildTagDescription(config.site.title, tag, lang),
    path,
    kind: "tag",
  });
}

export function buildArchiveSeo(
  period: string,
  path: string,
  lang: string,
): SeoMetadata {
  return buildWebsiteSeo({
    title: period,
    description: buildArchiveDescription(config.site.title, period, lang),
    path,
    kind: "website",
  });
}

export function buildWebsiteSeo(
  input: {
    title: string;
    description?: string;
    path: string;
    kind?: "index" | "tag" | "website";
  },
  headTags?: readonly PluginHeadTag[],
): SeoMetadata {
  return seoProvider.buildWebsiteSeo(config, input, headTags);
}

export function buildAbsoluteUrl(pathOrUrl: string): string {
  return seoProvider.buildAbsoluteUrl(config, pathOrUrl);
}

export function buildPostUrl(permalink: string): string {
  return seoProvider.buildPostUrl(config, permalink);
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
