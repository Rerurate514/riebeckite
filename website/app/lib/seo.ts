import { config } from "virtual:riebeckite/config";
import {
  type PluginHeadTag,
  type PostContent,
  resolveSeoProvider,
  type SeoMetadata,
} from "@riebeckite/core";
import {
  buildSoftwareApplicationSchema,
  getHomeMetadata,
  getHomePath,
  type HomeLocale,
} from "./home";

function seoProvider() {
  return resolveSeoProvider(config);
}

export type { SeoMetadata } from "@riebeckite/core";

export function buildArticleSeo(
  permalink: string,
  post: PostContent,
  headTags?: readonly PluginHeadTag[],
  language?: string,
): SeoMetadata {
  return seoProvider().buildArticleSeo(
    config,
    permalink,
    post,
    headTags,
    language,
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
  return seoProvider().buildWebsiteSeo(config, input, headTags, language);
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
  return seoProvider().buildAbsoluteUrl(config, pathOrUrl);
}

export function buildPostUrl(permalink: string): string {
  return seoProvider().buildPostUrl(config, permalink);
}

export function getHtmlLanguage(): string {
  return seoProvider().getHtmlLanguage(config);
}
