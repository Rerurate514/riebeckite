import { type ContentManifestEntry, isPublished } from "@riebeckite/core";
import { config } from "../../config";
import { content } from "../../content";
import { getArticleTitle } from "../../lib/article-title";
import type {
  GardenExplorerData,
  GardenExplorerEdge,
  GardenExplorerFolder,
  GardenExplorerNote,
  GardenExplorerTag,
} from "./garden-explorer";

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
    edges: buildEdges(notes, publishedSlugs),
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
    excerpt: createExcerpt(entry),
    tags: entry.tags,
    folder: getFolder(entry.slug),
    outgoing: uniqueStrings(outgoing),
    backlinks: entry.backlinks.filter((slug) => publishedSlugs.has(slug)),
  };
}

function buildEdges(
  notes: GardenExplorerNote[],
  publishedSlugs: Set<string>,
): GardenExplorerEdge[] {
  const edges = new Map<string, GardenExplorerEdge>();

  for (const note of notes) {
    for (const target of note.outgoing) {
      if (!publishedSlugs.has(target)) continue;
      const key = `${note.slug}\u0000${target}`;
      edges.set(key, { source: note.slug, target });
    }
  }

  return Array.from(edges.values());
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
