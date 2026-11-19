import type {
  ContentManifest,
  PluginHeadTag,
  PublicContentView,
} from "@riebeckite/core";
import type { WebLocale } from "./locale";

export type BlogPostSummary = {
  slug: string;
  href: string;
  title: string;
  description: string | undefined;
  date: string | undefined;
  category: string | undefined;
  tags: readonly string[];
};

export function getBlogPath(locale: WebLocale): string {
  return locale === "ja" ? "/ja/blog" : "/blog";
}

export function isBlogPath(path: string): boolean {
  return /^\/(?:ja\/)?blog(?:\/|$)/.test(path);
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

export function getBlogPosts(
  locale: WebLocale,
  view: PublicContentView,
  manifest: ContentManifest,
): BlogPostSummary[] {
  const prefix = `${getBlogPath(locale)}/`;
  const frontmatterBySlug = new Map(
    manifest.entries.map((entry) => [entry.slug, entry.frontmatter]),
  );

  return view.discoverableEntries
    .filter((entry) => entry.permalink.startsWith(prefix))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .map((entry) => {
      const frontmatter = frontmatterBySlug.get(entry.slug) ?? {};
      return {
        slug: entry.slug,
        href: entry.permalink,
        title: entry.title,
        description: asString(frontmatter.description),
        date: entry.date ?? undefined,
        category: asString(frontmatter.category),
        tags: entry.tags,
      };
    });
}

export function formatBlogDate(
  value: string | undefined,
  locale: WebLocale,
): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    dateStyle: "long",
  }).format(date);
}

export function getBlogIndexHeadTags(locale: WebLocale): PluginHeadTag[] {
  const self = getBlogPath(locale);
  const other = getBlogPath(locale === "ja" ? "en" : "ja");
  return [
    {
      tag: "link",
      attrs: { rel: "alternate", hreflang: locale, href: self },
    },
    {
      tag: "link",
      attrs: {
        rel: "alternate",
        hreflang: locale === "ja" ? "en" : "ja",
        href: other,
      },
    },
    {
      tag: "link",
      attrs: { rel: "alternate", hreflang: "x-default", href: "/blog" },
    },
  ];
}
