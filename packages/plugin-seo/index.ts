import type {
  ContentManifestEntry,
  PostContent,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { definePlugin, isPublished } from "@riebeckite/core";

export type FeedOptions = {
  rss?: boolean;
  atom?: boolean;
  json?: boolean;
};

export type SeoPluginOptions = {
  siteName?: string;
  defaultImage?: string;
  feed?: FeedOptions;
  sitemap?: boolean;
  robots?: boolean;
};

export type SeoPageKind = "index" | "tag" | "article" | "website";

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
  kind?: SeoPageKind;
};

export type RenderableFeedEntry = ContentManifestEntry & {
  html?: string;
};

export function seo(options: SeoPluginOptions = {}) {
  return definePlugin({
    name: "seo",
    options,
  });
}

export function buildArticleSeo(
  config: ResolvedRiebeckiteConfig,
  options: SeoPluginOptions,
  slug: string,
  post: PostContent,
): SeoMetadata {
  const siteName = getSiteName(config, options);
  const title = getArticleTitle(config, slug, post.frontmatter.title);
  const canonicalUrl = buildCanonicalUrl(
    config,
    post.frontmatter.canonical,
    slug,
  );
  const description = getDescription(post) || config.site.description;
  const imageUrl = buildImageUrl(
    config,
    options,
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
  const breadcrumb = buildBreadcrumbSchema(config, [
    { name: siteName, url: buildAbsoluteUrl(config, "/") },
    { name: title, url: canonicalUrl },
  ]);

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
    jsonLd: [
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
        timeRequired: readingTimeMinutes
          ? `PT${readingTimeMinutes}M`
          : undefined,
        inLanguage: getHtmlLanguage(config),
      }),
      breadcrumb,
    ],
  };
}

export function buildWebsiteSeo(
  config: ResolvedRiebeckiteConfig,
  options: SeoPluginOptions,
  input: WebsiteSeoInput,
): SeoMetadata {
  const siteName = getSiteName(config, options);
  const canonicalUrl = buildAbsoluteUrl(config, input.path);
  const description = input.description || config.site.description;
  const imageUrl = buildImageUrl(config, options);
  const title =
    input.kind === "tag" ? input.title : buildPageTitle(siteName, input.title);

  return {
    title,
    description,
    canonicalUrl,
    imageUrl,
    type: "website",
    noindex: false,
    tags: [],
    jsonLd: [
      removeUndefined({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: siteName,
        description,
        url: canonicalUrl,
        inLanguage: getHtmlLanguage(config),
      }),
      buildBreadcrumbSchema(config, [
        { name: siteName, url: buildAbsoluteUrl(config, "/") },
      ]),
    ],
  };
}

export function buildAbsoluteUrl(
  config: ResolvedRiebeckiteConfig,
  pathOrUrl: string,
): string {
  if (!pathOrUrl) return config.site.baseUrl;
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;

  return new URL(
    pathOrUrl,
    config.site.baseUrl || "https://example.com",
  ).toString();
}

export function buildPostUrl(
  config: ResolvedRiebeckiteConfig,
  slug: string,
): string {
  return buildAbsoluteUrl(config, slug === "index" ? "/" : `/${slug}`);
}

export function getDescription(
  post: Pick<PostContent, "frontmatter" | "html">,
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

export function filterFeedEntries(
  config: ResolvedRiebeckiteConfig,
  entries: ContentManifestEntry[],
): ContentManifestEntry[] {
  return entries
    .filter((entry) => isPublished(config, entry.frontmatter))
    .filter((entry) => entry.frontmatter.noindex !== true)
    .sort((a, b) => getSortableTime(b) - getSortableTime(a));
}

export function renderSitemap(
  config: ResolvedRiebeckiteConfig,
  entries: ContentManifestEntry[],
): string {
  const urls = [
    { loc: buildAbsoluteUrl(config, "/"), lastmod: undefined },
    ...filterFeedEntries(config, entries)
      .filter((entry) => entry.slug !== "index")
      .map((entry) => ({
        loc: buildPostUrl(config, entry.slug),
        lastmod: getEntryUpdatedTime(entry),
      })),
  ];
  const body = urls
    .map(
      (url) =>
        `<url><loc>${escapeXml(url.loc)}</loc>${url.lastmod ? `<lastmod>${escapeXml(url.lastmod)}</lastmod>` : ""}</url>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export function renderRobots(config: ResolvedRiebeckiteConfig): string {
  return [
    `User-agent: *`,
    `Allow: /`,
    `Sitemap: ${buildAbsoluteUrl(config, "/sitemap.xml")}`,
    "",
  ].join("\n");
}

export function renderRssFeed(
  config: ResolvedRiebeckiteConfig,
  entries: RenderableFeedEntry[],
): string {
  const items = entries.map((entry) => {
    const url = buildPostUrl(config, entry.slug);
    const pubDate = getEntryPublishedTime(entry);
    return `<item><title>${escapeXml(entry.title)}</title><link>${escapeXml(url)}</link><guid>${escapeXml(url)}</guid><description>${escapeXml(getDescription(entry))}</description>${pubDate ? `<pubDate>${new Date(pubDate).toUTCString()}</pubDate>` : ""}</item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(config.site.feed.title)}</title><link>${escapeXml(buildAbsoluteUrl(config, "/"))}</link><description>${escapeXml(config.site.feed.description)}</description><language>${escapeXml(config.site.feed.language)}</language>${items.join("")}</channel></rss>`;
}

export function renderAtomFeed(
  config: ResolvedRiebeckiteConfig,
  entries: RenderableFeedEntry[],
): string {
  const updated =
    entries.map(getEntryUpdatedTime).find(Boolean) ?? new Date(0).toISOString();
  const items = entries.map((entry) => {
    const url = buildPostUrl(config, entry.slug);
    return `<entry><title>${escapeXml(entry.title)}</title><link href="${escapeXml(url)}"/><id>${escapeXml(url)}</id><updated>${escapeXml(getEntryUpdatedTime(entry) ?? updated)}</updated><summary>${escapeXml(getDescription(entry))}</summary></entry>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>${escapeXml(config.site.feed.title)}</title><link href="${escapeXml(buildAbsoluteUrl(config, "/"))}"/><link rel="self" href="${escapeXml(buildAbsoluteUrl(config, "/atom.xml"))}"/><id>${escapeXml(buildAbsoluteUrl(config, "/"))}</id><updated>${escapeXml(updated)}</updated>${items.join("")}</feed>`;
}

export function renderJsonFeed(
  config: ResolvedRiebeckiteConfig,
  entries: RenderableFeedEntry[],
): string {
  return JSON.stringify({
    version: "https://jsonfeed.org/version/1.1",
    title: config.site.feed.title,
    home_page_url: buildAbsoluteUrl(config, "/"),
    feed_url: buildAbsoluteUrl(config, "/feed.json"),
    description: config.site.feed.description,
    language: getHtmlLanguage(config),
    items: entries.map((entry) => {
      const url = buildPostUrl(config, entry.slug);
      return removeUndefined({
        id: url,
        url,
        title: entry.title,
        content_html: entry.html,
        summary: getDescription(entry),
        date_published: getEntryPublishedTime(entry) ?? undefined,
        date_modified: getEntryUpdatedTime(entry) ?? undefined,
        tags: normalizeTags(entry.frontmatter.tags),
      });
    }),
  });
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

export function getHtmlLanguage(config: ResolvedRiebeckiteConfig): string {
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

  return Math.max(1, Math.ceil(cjkChars / 500 + latinWords / 220));
}

function buildCanonicalUrl(
  config: ResolvedRiebeckiteConfig,
  canonical: unknown,
  slug: string,
): string {
  if (typeof canonical === "string" && canonical.trim()) {
    return buildAbsoluteUrl(config, canonical.trim());
  }

  return buildPostUrl(config, slug);
}

function buildImageUrl(
  config: ResolvedRiebeckiteConfig,
  options: SeoPluginOptions,
  value?: string,
): string {
  const image = value || options.defaultImage || config.site.defaultOgImage;
  return image ? buildAbsoluteUrl(config, image) : "";
}

function getSiteName(
  config: ResolvedRiebeckiteConfig,
  options: SeoPluginOptions,
): string {
  return options.siteName || config.site.title;
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

function buildBreadcrumbSchema(
  config: ResolvedRiebeckiteConfig,
  items: { name: string; url: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url || buildAbsoluteUrl(config, "/"),
    })),
  };
}

function getIsoDate(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime()))
    return value.toISOString();
  if (typeof value !== "string" || !value.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function getSortableTime(entry: ContentManifestEntry): number {
  const value =
    entry.frontmatter.updated ??
    entry.frontmatter.published ??
    entry.frontmatter.date ??
    entry.frontmatter.created;
  if (value instanceof Date) return value.getTime();
  if (typeof value !== "string") return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as T;
}
