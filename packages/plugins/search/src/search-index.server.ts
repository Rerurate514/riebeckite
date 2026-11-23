import {
  type ContentManifest,
  createEntryExcerpt,
  extractHtmlHeadings,
  getEntryLanguage,
  getEntryPlainText,
  type ResolvedRiebeckiteConfig,
  resolveEntryDate,
} from "@riebeckite/core";
import type { SearchItem } from "./search.js";

const MAX_BODY_LENGTH = 4_000;

type TitleResolver = (slug: string, title: unknown) => string;

export function buildSearchItems(args: {
  manifest: ContentManifest;
  config: ResolvedRiebeckiteConfig;
  resolveTitle?: TitleResolver;
}): SearchItem[] {
  const resolveTitle = args.resolveTitle ?? getDefaultArticleTitle;
  const items = args.manifest.discoverableEntries.map((entry) => {
    const language = getEntryLanguage(entry);
    return {
      slug: entry.slug,
      permalink: entry.permalink,
      title: resolveTitle(entry.slug, entry.frontmatter.title),
      aliases: [...(entry.aliases ?? [])],
      headings: extractHtmlHeadings(entry.html),
      body: getEntryPlainText(entry).slice(0, MAX_BODY_LENGTH),
      excerpt: createEntryExcerpt(entry),
      tags: entry.tags,
      ...(entry.icon ? { icon: entry.icon } : {}),
      ...(language === undefined ? {} : { language }),
      date: resolveEntryDate(entry.frontmatter),
    };
  });

  return items.sort(
    (a, b) =>
      a.title.localeCompare(b.title, "ja") ||
      a.permalink.localeCompare(b.permalink, "en"),
  );
}

function getDefaultArticleTitle(slug: string, title: unknown): string {
  if (typeof title === "string" && title.trim().length > 0) {
    return title.trim();
  }

  return slug.split("/").filter(Boolean).at(-1) ?? slug;
}
