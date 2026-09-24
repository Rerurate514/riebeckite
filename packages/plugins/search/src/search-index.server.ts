import {
  type ContentManifest,
  isPublished,
  type ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import type { SearchItem } from "./search";

const MAX_BODY_LENGTH = 4_000;

type TitleResolver = (slug: string, title: unknown) => string;

export function buildSearchItems(args: {
  manifest: ContentManifest;
  config: ResolvedRiebeckiteConfig;
  resolveTitle: TitleResolver;
}): SearchItem[] {
  const items = args.manifest.entries.map((entry) => {
    if (!isPublished(args.config, entry.frontmatter)) return null;

    return {
      slug: entry.slug,
      title: args.resolveTitle(entry.slug, entry.frontmatter.title),
      headings: extractHeadings(entry.html),
      body: toPlainText(entry.html).slice(0, MAX_BODY_LENGTH),
      excerpt: createExcerpt(entry),
      tags: entry.tags,
      date: getEntryDate(entry.frontmatter),
    };
  });

  return items
    .filter((item): item is SearchItem => item !== null)
    .sort((a, b) => a.title.localeCompare(b.title, "ja"));
}

function extractHeadings(html: string): string[] {
  const headings: string[] = [];
  const headingPattern = /<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/g;

  for (const match of html.matchAll(headingPattern)) {
    const heading = toPlainText(match[2] ?? "");
    if (heading) headings.push(heading);
  }

  return headings;
}

function createExcerpt(entry: {
  frontmatter: { description?: unknown };
  html: string;
}): string {
  const description = entry.frontmatter.description;
  const text =
    typeof description === "string" && description.trim()
      ? description.trim()
      : toPlainText(entry.html);

  return text.slice(0, 180);
}

function getEntryDate(frontmatter: {
  published?: unknown;
  date?: unknown;
  created?: unknown;
}): string | null {
  const value =
    frontmatter.published ?? frontmatter.date ?? frontmatter.created;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value !== "string" || !value.trim()) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toPlainText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
