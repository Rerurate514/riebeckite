import { config } from "virtual:riebeckite/config";
import type {
  PluginHeadTag,
  PluginSeoExtension,
  PostContent,
  SeoMetadata,
} from "@riebeckite/core";
import { resolvePlugins } from "@riebeckite/core";
import {
  buildSoftwareApplicationSchema,
  getHomeMetadata,
  getHomePath,
  type HomeLocale,
} from "./home";
import { buildArchiveDescription } from "./locale";

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
  language?: string,
): SeoMetadata {
  return seoProvider.buildArticleSeo(
    config,
    permalink,
    post,
    headTags,
    language,
  );
}

export function buildArchiveSeo(
  period: string,
  path: string,
  lang: string,
): SeoMetadata {
  return buildWebsiteSeo(
    {
      title: period,
      description: buildArchiveDescription(config.site.title, period, lang),
      path,
      kind: "website",
    },
    undefined,
    lang,
  );
}

export function buildWebsiteSeo(
  input: {
    title: string;
    description?: string;
    path: string;
    kind?: "index" | "tag" | "website";
  },
  headTags?: readonly PluginHeadTag[],
  language?: string,
): SeoMetadata {
  return seoProvider.buildWebsiteSeo(config, input, headTags, language);
}

export function buildHomeSeo(
  locale: HomeLocale,
  headTags?: readonly PluginHeadTag[],
): SeoMetadata {
  const metadata = getHomeMetadata(locale);
  const website = buildWebsiteSeo(
    {
      title: metadata.title,
      description: metadata.description,
      path: getHomePath(locale),
      kind: "index",
    },
    headTags,
    locale === "ja" ? "ja-JP" : "en-US",
  );
  const jsonLd = ((website.jsonLd ?? []) as Record<string, unknown>[]).filter(
    (schema) => schema["@type"] !== "BreadcrumbList",
  );
  jsonLd.push(buildSoftwareApplicationSchema(locale, website.canonicalUrl));

  return { ...website, title: metadata.title, jsonLd };
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
