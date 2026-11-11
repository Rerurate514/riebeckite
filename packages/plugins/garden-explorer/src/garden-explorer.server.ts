import type {
  ContentManifest,
  ContentManifestEntry,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { resolveEntryDate, selectLocalizedEntries } from "@riebeckite/core";
import { buildGraphEdges } from "@riebeckite/core/client";
import { buildGraphDocument } from "@riebeckite/graph";
import type {
  GardenExplorerData,
  GardenExplorerFolder,
  GardenExplorerNote,
  GardenExplorerOptions,
  GardenExplorerPluginOptions,
  GardenExplorerTag,
} from "./garden-explorer.js";

const MAX_BODY_LENGTH = 4_000;

type TitleResolver = (slug: string, title: unknown) => string;

export function getGardenExplorerData(args: {
  manifest: ContentManifest;
  config: ResolvedRiebeckiteConfig;
  resolveTitle: TitleResolver;
  options?: GardenExplorerPluginOptions;
  locale?: string;
}): GardenExplorerData {
  const graph = args.manifest.graph;
  const publishedEntries = selectLocalizedEntries(
    args.manifest.discoverableEntries,
    {
      mode: args.options?.localeMode ?? "current",
      locale: args.locale,
      ...(args.manifest.localization?.fallbackLocale
        ? { fallbackLocale: args.manifest.localization.fallbackLocale }
        : {}),
    },
  ).filter((entry) => !isExcludedEntry(entry, args.options?.exclude ?? []));
  const publishedSlugs = new Set(publishedEntries.map((entry) => entry.slug));

  const notes = publishedEntries
    .map((entry) =>
      toGardenNote(entry, graph, publishedSlugs, args.resolveTitle),
    )
    .sort((a, b) => a.title.localeCompare(b.title, "ja"));

  return {
    notes,
    edges: buildGraphEdges(notes, publishedSlugs),
    graph: buildGraphDocument(
      publishedEntries.map((entry) => ({
        slug: entry.slug,
        title: args.resolveTitle(entry.slug, entry.frontmatter.title),
        permalink: entry.permalink,
        tags: entry.tags,
        links: entry.links,
        assets: entry.assets,
        date: resolveEntryDate(entry.frontmatter),
      })),
    ),
    tags: buildTags(notes),
    folders: buildFolders(notes),
    options: resolveGardenExplorerOptions(args.options),
  };
}

export function resolveGardenExplorerOptions(
  options: GardenExplorerPluginOptions = {},
): GardenExplorerOptions {
  return {
    layout: resolveGraphLayout(options.layout),
    depth: clampInteger(options.depth ?? 1, 0, 4),
    showTags: options.showTags ?? true,
    showFolders: options.showFolders ?? true,
    nodeSize: clampNumber(options.nodeSize ?? 1, 0.6, 2),
    linkDistance: clampNumber(options.linkDistance ?? 84, 36, 180),
    repulsion: clampNumber(options.repulsion ?? 1_800, 200, 8_000),
    showLabels: options.showLabels ?? true,
  };
}

function resolveGraphLayout(
  layout: GardenExplorerPluginOptions["layout"],
): GardenExplorerOptions["layout"] {
  return layout === "radial" || layout === "force" ? layout : "force";
}

function toGardenNote(
  entry: ContentManifestEntry,
  graph: ContentManifest["graph"],
  publishedSlugs: Set<string>,
  resolveTitle: TitleResolver,
): GardenExplorerNote {
  const { outgoingSlugs, incomingSlugs } = graph.filterNeighbors(
    entry.slug,
    (slug) => publishedSlugs.has(slug),
  );

  return {
    slug: entry.slug,
    permalink: entry.permalink,
    title: resolveTitle(entry.slug, entry.frontmatter.title),
    headings: extractHeadings(entry.html),
    body: toPlainText(entry.html).slice(0, MAX_BODY_LENGTH),
    excerpt: createExcerpt(entry),
    tags: entry.tags,
    date: resolveEntryDate(entry.frontmatter),
    folder: getFolder(entry.slug),
    outgoing: outgoingSlugs,
    backlinks: incomingSlugs,
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
  for (const note of notes)
    counts.set(note.folder, (counts.get(note.folder) ?? 0) + 1);

  return Array.from(counts, ([path, count]) => ({ path, count })).sort((a, b) =>
    a.path.localeCompare(b.path, "ja"),
  );
}

function getFolder(slug: string): string {
  const segments = slug.split("/");
  if (segments.length <= 1) return "Root";
  return segments.slice(0, -1).join("/");
}

function isExcludedEntry(
  entry: ContentManifestEntry,
  excludedSlugs: readonly string[],
): boolean {
  const slug =
    entry.publicLocation.metadata?.["l10n.translationId"] ?? entry.slug;
  return excludedSlugs.some(
    (excluded) => slug === excluded || slug.startsWith(`${excluded}/`),
  );
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

function clampInteger(value: number, min: number, max: number): number {
  return Math.round(clampNumber(value, min, max));
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}
