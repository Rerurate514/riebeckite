import type {
  PluginHeadTag,
  PostContent,
  ResolvedRiebeckiteConfig,
  SeoMetadata,
  WebsiteSeoInput,
} from "@riebeckite/core";
import { calculateReadingTime } from "@riebeckite/core";
import { getDescription, getHtmlLanguage, normalizeTags } from "./content.js";
import { buildBreadcrumbSchema, removeUndefined } from "./schema.js";
import { buildAbsoluteUrl, buildPostUrl } from "./url.js";

export function buildArticleSeo(
  config: ResolvedRiebeckiteConfig,
  permalink: string,
  post: PostContent,
  headTags?: readonly PluginHeadTag[],
  language?: string,
): SeoMetadata {
  const siteName = config.site.title;
  const title = getArticleTitle(config, permalink, post.frontmatter.title);
  const canonicalUrl = buildCanonicalUrl(
    config,
    post.frontmatter.canonical,
    permalink,
  );
  const description = getDescription(post) || config.site.description;
  const imageUrl = buildImageUrl(
    config,
    post.frontmatter.ogImage ?? post.frontmatter.image,
  );
  const publishedTime = getIsoDate(
    post.frontmatter.published ??
      post.frontmatter.date ??
      post.frontmatter.created,
  );
  const modifiedTime = getIsoDate(post.frontmatter.updated) ?? publishedTime;
  const tags = normalizeTags(post.frontmatter.tags);
  const readingTimeMinutes = calculateReadingTime(post.html);
  const jsonLd: Record<string, unknown>[] = [
    removeUndefined({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: title,
      description,
      url: canonicalUrl,
      image: imageUrl ? [imageUrl] : undefined,
      datePublished: publishedTime,
      dateModified: modifiedTime,
      author: config.site.author
        ? { "@type": "Person", name: config.site.author }
        : undefined,
      publisher: { "@type": "Organization", name: siteName },
      keywords: tags.length > 0 ? tags.join(", ") : undefined,
      timeRequired: readingTimeMinutes ? `PT${readingTimeMinutes}M` : undefined,
      inLanguage: resolveInLanguage(config, language),
    }),
  ];

  if (!hasBreadcrumbListHeadTag(headTags)) {
    jsonLd.push(
      buildBreadcrumbSchema(config, [
        { name: siteName, url: buildAbsoluteUrl(config, "/") },
        { name: title, url: canonicalUrl },
      ]),
    );
  }

  return {
    title: buildPageTitle(siteName, title),
    description,
    canonicalUrl,
    imageUrl,
    type: "article",
    noindex: post.frontmatter.noindex === true,
    publishedTime,
    modifiedTime,
    tags,
    readingTimeMinutes,
    jsonLd,
  };
}

export function buildWebsiteSeo(
  config: ResolvedRiebeckiteConfig,
  input: WebsiteSeoInput,
  headTags?: readonly PluginHeadTag[],
  language?: string,
): SeoMetadata {
  const siteName = config.site.title;
  const canonicalUrl = buildAbsoluteUrl(config, input.path);
  const description = input.description || config.site.description;
  const imageUrl = buildImageUrl(config);
  const title =
    input.kind === "tag" ? input.title : buildPageTitle(siteName, input.title);
  const jsonLd: Record<string, unknown>[] = [
    removeUndefined({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteName,
      description,
      url: canonicalUrl,
      inLanguage: resolveInLanguage(config, language),
    }),
  ];

  if (!hasBreadcrumbListHeadTag(headTags)) {
    jsonLd.push(
      buildBreadcrumbSchema(config, [
        { name: siteName, url: buildAbsoluteUrl(config, "/") },
      ]),
    );
  }

  return {
    title,
    description,
    canonicalUrl,
    imageUrl,
    type: "website",
    noindex: false,
    tags: [],
    jsonLd,
  };
}

function resolveInLanguage(
  config: ResolvedRiebeckiteConfig,
  language: string | undefined,
): string {
  const value = language?.trim();
  return value ? value.replace("_", "-") : getHtmlLanguage(config);
}

function buildCanonicalUrl(
  config: ResolvedRiebeckiteConfig,
  canonical: unknown,
  permalink: string,
): string {
  if (typeof canonical === "string" && canonical.trim()) {
    return buildAbsoluteUrl(config, canonical.trim());
  }

  return buildPostUrl(config, permalink);
}

function buildImageUrl(
  config: ResolvedRiebeckiteConfig,
  value?: string,
): string {
  const image = value || config.site.defaultOgImage;
  return image ? buildAbsoluteUrl(config, image) : "";
}

function getArticleTitle(
  config: ResolvedRiebeckiteConfig,
  slug: string,
  value: unknown,
): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  const lastSegment = slug.split("/").filter(Boolean).at(-1);
  return lastSegment || config.site.title;
}

function buildPageTitle(siteName: string, title: string): string {
  if (!title || title === siteName) return siteName;
  return `${title} | ${siteName}`;
}

function getIsoDate(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value !== "string" || !value.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function hasBreadcrumbListHeadTag(
  headTags: readonly PluginHeadTag[] | undefined,
): boolean {
  return (
    headTags?.some(
      (tag) =>
        tag.tag === "script" &&
        typeof tag.children === "string" &&
        hasBreadcrumbListJsonLd(tag.children),
    ) ?? false
  );
}

function hasBreadcrumbListJsonLd(value: string): boolean {
  try {
    return hasBreadcrumbListType(JSON.parse(value));
  } catch {
    return false;
  }
}

function hasBreadcrumbListType(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasBreadcrumbListType);
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  if (record["@type"] === "BreadcrumbList") return true;
  return hasBreadcrumbListType(record["@graph"]);
}
