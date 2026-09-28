import type { ContentManifestEntry } from "../types/content_manifest";
import type { ContentGraph } from "./content_graph";
import { extractContentLinks } from "./content_links";
import { ContentIndexBuilder } from "./content_index_builder";
import { ManifestBuilder } from "./manifest_builder";
import type { ContentSource, ContentSourceEntry } from "./content_source";

/**
 * Builds the framework's content graph without rendering content, invoking
 * plugins, or writing incremental build state.
 */
export async function readOnlyContentGraph(
  source: ContentSource,
): Promise<ContentGraph> {
  const entries = await source.scan();
  const contentIndex = await new ContentIndexBuilder(source).build(entries);
  const markdownEntries = entries
    .filter((entry) => entry.path.endsWith(".md"))
    .toSorted((left, right) => left.path.localeCompare(right.path));
  const markdownContents = await Promise.all(
    markdownEntries.map(async (entry) => ({
      entry,
      markdown: await readText(source, entry),
    })),
  );
  const graphEntries = markdownContents.map(({ entry, markdown }) =>
    createGraphEntry(entry, markdown, contentIndex),
  );

  return new ManifestBuilder().build(graphEntries, contentIndex).graph;
}

function createGraphEntry(
  entry: ContentSourceEntry,
  markdown: string,
  contentIndex: Map<string, string>,
): ContentManifestEntry {
  const slug = entry.path.replace(/\.md$/, "");
  return {
    slug,
    title: slug,
    frontmatter: {},
    html: "",
    tags: [],
    links: extractContentLinks(markdown, contentIndex),
    backlinks: [],
    assets: [],
  };
}

async function readText(
  source: ContentSource,
  entry: ContentSourceEntry,
): Promise<string> {
  const content = await source.read(entry);
  return typeof content === "string"
    ? content
    : new TextDecoder().decode(content);
}
