import { type ContentManifestEntry, isPublished } from "@riebeckite/core";
import { config } from "../../config";
import { content } from "../../content";
import { getArticleTitle } from "../../lib/article-title";
import { buildGraphEdges } from "../graph/graph";
import type {
  GardenExplorerData,
  GardenExplorerFolder,
  GardenExplorerNote,
  GardenExplorerTag,
} from "./garden-explorer";

const MAX_BODY_LENGTH = 4_000;

export async function getGardenExplorerData(): Promise<GardenExplorerData> {
  const manifest = await content.getManifest();
  const publishedEntries = manifest.entries.filter((entry) =>
    isPublished(config, entry.frontmatter),
  );
  const publishedSlugs = new Set(publishedEntries.map((entry) => entry.slug));

  const notes = publishedEntries
    .map((entry) => toGardenNote(entry, publishedSlugs))
    .sort((a, b) => a.title.localeCompare(b.title, "ja"));

  return {
    notes,
    edges: buildGraphEdges(notes, publishedSlugs),
    tags: buildTags(notes),
    folders: buildFolders(notes),
  };
}

function toGardenNote(
  entry: ContentManifestEntry,
  publishedSlugs: Set<string>,
): GardenExplorerNote {
  const outgoing = entry.links
    .filter(
      (link): link is typeof link & { slug: string } =>
        link.kind === "note" &&
        link.slug !== null &&
        link.slug !== entry.slug &&
        publishedSlugs.has(link.slug),
    )
    .map((link) => link.slug);

  return {
    slug: entry.slug,
    title: getArticleTitle(entry.slug, entry.frontmatter.title),
    headings: extractHeadings(entry.html),
    body: toPlainText(entry.html).slice(0, MAX_BODY_LENGTH),
    excerpt: createExcerpt(entry),
    tags: entry.tags,
    date: getEntryDate(entry.frontmatter),
    folder: getFolder(entry.slug),
    outgoing: uniqueStrings(outgoing),
    backlinks: entry.backlinks.filter((slug) => publishedSlugs.has(slug)),
  };
}

function buildTags(notes: GardenExplorerNote[]): GardenExplorerTag[] {
  const counts = new Map<string, number>();
  for (const note of notes) {
    for (const tag of note.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  return Array.from(counts, ([name, count]) => ({ name, count })).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, "ja"),
  );
}

function buildFolders(notes: GardenExplorerNote[]): GardenExplorerFolder[] {
  const counts = new Map<string, number>();
  for (const note of notes) {
    counts.set(note.folder, (counts.get(note.folder) ?? 0) + 1);
  }

  return Array.from(counts, ([path, count]) => ({ path, count })).sort((a, b) =>
    a.path.localeCompare(b.path, "ja"),
  );
}

function getFolder(slug: string): string {
  const segments = slug.split("/");
  if (segments.length <= 1) return "Root";
  return segments.slice(0, -1).join("/");
}

function createExcerpt(entry: ContentManifestEntry): string {
  const description = entry.frontmatter.description;
  const text =
    typeof description === "string" && description.trim()
      ? description.trim()
      : toPlainText(entry.html);

  return text.slice(0, 180);
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
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}
