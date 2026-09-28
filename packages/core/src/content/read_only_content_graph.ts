import type {
  ContentManifestEntry,
  ContentPublicLocation,
} from "../types/content_manifest.js";
import type { ContentGraph } from "./content_graph.js";
import { ContentIndexBuilder } from "./content_index_builder.js";
import { extractContentLinks } from "./content_links.js";
import type { ContentSource, ContentSourceEntry } from "./content_source.js";
import { ManifestBuilder } from "./manifest_builder.js";

/**
 * Builds the framework's content graph without rendering content, invoking
 * plugins, or writing incremental build state.
 *
 * Public locations are resolved before this call (for example via
 * `ContentManager`) and passed in, so this helper stays unaware of permalink
 * plugins, ID strategies, and path modes, and never fabricates a canonical URL
 * itself.
 */
export async function readOnlyContentGraph(
  source: ContentSource,
  locations: ReadonlyMap<string, ContentPublicLocation>,
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
    createGraphEntry(entry, markdown, contentIndex, locations),
  );

  return new ManifestBuilder().build(graphEntries, contentIndex).graph;
}

function createGraphEntry(
  entry: ContentSourceEntry,
  markdown: string,
  contentIndex: Map<string, string>,
  locations: ReadonlyMap<string, ContentPublicLocation>,
): ContentManifestEntry {
  const slug = entry.path.replace(/\.md$/, "");
  const location = locations.get(slug);
  if (!location) {
    throw new Error(`Content public location was not resolved: ${slug}`);
  }
  return {
    slug,
    permalink: location.permalink,
    publicLocation: location,
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
