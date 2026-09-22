import type { ContentManifestEntry, PostContent } from "@riebeckite/core";
import { config } from "../config";
import { getArticleTitle } from "./article-title";

export type SeoMetadata = {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl: string;
  type: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  tags: string[];
  readingTimeMinutes?: number;
  jsonLd?: Record<string, unknown>;
};

export function buildArticleSeo(slug: string, post: PostContent): SeoMetadata {
  const title = getArticleTitle(slug, post.frontmatter.title);
  const canonicalUrl = buildAbsoluteUrl(slug === "index" ? "/" : `/${slug}`);
  const description = getDescription(post) || config.site.description;
  const imageUrl = buildImageUrl(
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

  return {
    title: buildPageTitle(title),
    description,
    canonicalUrl,
    imageUrl,
    type: "article",
    publishedTime,
    modifiedTime,
    tags,
    readingTimeMinutes,
    jsonLd: {
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
      publisher: {
        "@type": "Organization",
        name: config.site.title,
      },
      keywords: tags.length > 0 ? tags.join(", ") : undefined,
      timeRequired: readingTimeMinutes ? `PT${readingTimeMinutes}M` : undefined,
      inLanguage: getHtmlLanguage(),
    },
  };
}

export function buildIndexSeo(post?: PostContent): SeoMetadata {
  const description = post ? getDescription(post) : "";
  return buildWebsiteSeo({
    title: config.site.title,
    description: description || config.site.description,
    path: "/",
  });
}

export function buildTagSeo(tag: string, path: string): SeoMetadata {
  return buildWebsiteSeo({
    title: buildPageTitle(`#${tag}`),
    description: `${config.site.title} の #${tag} タグの記事一覧です。`,
    path,
  });
}

export function buildWebsiteSeo(input: {
  title: string;
  description: string;
  path: string;
}): SeoMetadata {
  const canonicalUrl = buildAbsoluteUrl(input.path);
  const imageUrl = buildImageUrl();

  return {
    title: input.title,
    description: input.description,
    canonicalUrl,
    imageUrl,
    type: "website",
    tags: [],
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: config.site.title,
      description: input.description,
      url: canonicalUrl,
      inLanguage: getHtmlLanguage(),
    },
  };
}

export function buildAbsoluteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return config.site.baseUrl;
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;

  const baseUrl = config.site.baseUrl || "https://example.com";
  return new URL(pathOrUrl, baseUrl).toString();
}

export function buildPostUrl(slug: string): string {
  return buildAbsoluteUrl(slug === "index" ? "/" : `/${slug}`);
}

export function getEntryPublishedTime(
  entry: ContentManifestEntry,
): string | null {
  return (
    getIsoDate(
      entry.frontmatter.published ??
        entry.frontmatter.date ??
        entry.frontmatter.created,
    ) ?? null
  );
}

export function getEntryUpdatedTime(
  entry: ContentManifestEntry,
): string | null {
  return getIsoDate(entry.frontmatter.updated) ?? getEntryPublishedTime(entry);
}

export function getHtmlLanguage(): string {
  return config.site.locale.replace("_", "-");
}

export function calculateReadingTime(html: string): number {
  const text = stripHtml(html).trim();
  if (!text) return 1;

  const cjkChars =
    text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu)
      ?.length ?? 0;
  const latinWords =
    text
      .replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu, " ")
      .match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  const minutes = cjkChars / 500 + latinWords / 220;

  return Math.max(1, Math.ceil(minutes));
}

export function getDescription(
  post: PostContent | ContentManifestEntry,
): string {
  const frontmatterDescription = post.frontmatter.description;
  if (
    typeof frontmatterDescription === "string" &&
    frontmatterDescription.trim()
  ) {
    return frontmatterDescription.trim();
  }

  return stripHtml(post.html).replace(/\s+/g, " ").trim().slice(0, 160);
}

function buildPageTitle(title: string): string {
  if (!title || title === config.site.title) return config.site.title;
  return `${title} | ${config.site.title}`;
}

function buildImageUrl(value?: string): string {
  const image = value || config.site.defaultOgImage;
  return image ? buildAbsoluteUrl(image) : "";
}

function getIsoDate(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value !== "string" || !value.trim()) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.filter(
    (tag): tag is string => typeof tag === "string" && tag.trim().length > 0,
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}
