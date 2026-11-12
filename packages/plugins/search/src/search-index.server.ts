import {
  type ContentManifest,
  getEntryLanguage,
  htmlToPlainText,
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
    const plainText = entry.plainText ?? htmlToPlainText(entry.html);
    return {
      slug: entry.slug,
      permalink: entry.permalink,
      title: resolveTitle(entry.slug, entry.frontmatter.title),
      aliases: [...(entry.aliases ?? [])],
      headings: extractHeadings(entry.html),
      body: plainText.slice(0, MAX_BODY_LENGTH),
      excerpt: createExcerpt(entry, plainText),
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

function extractHeadings(html: string): string[] {
  const headings: string[] = [];
  const headingPattern = /<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/g;

  for (const match of html.matchAll(headingPattern)) {
    const heading = htmlToPlainText(match[2] ?? "");
    if (heading) headings.push(heading);
  }

  return headings;
}

function createExcerpt(
  entry: {
    frontmatter: { description?: unknown };
  },
  plainText: string,
): string {
  const description = entry.frontmatter.description;
  const text =
    typeof description === "string" && description.trim()
      ? description.trim()
      : plainText;

  return text.slice(0, 180);
}
