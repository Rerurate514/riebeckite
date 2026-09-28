import type {
  ContentAsset,
  ContentLink,
  ContentManifest,
  ContentManifestEntry,
  ContentPublicLocation,
} from "../types/content_manifest.js";
import type { PostContent } from "../types/post_content.js";
import { uniqueStrings } from "../utils/collections.js";
import { createContentGraph } from "./content_graph.js";
import { extractContentLinks } from "./content_links.js";
import {
  extractContentTags,
  normalizeFrontmatterTags,
} from "./content_metadata.js";

export class ManifestBuilder {
  createEntry(
    slug: string,
    markdown: string,
    processed: PostContent,
    contentIndex: Map<string, string>,
    location: ContentPublicLocation,
  ): ContentManifestEntry {
    const links = extractContentLinks(markdown, contentIndex);
    const assets = links
      .filter(
        (link): link is ContentLink & { slug: string } =>
          (link.kind === "image" || link.kind === "attachment") &&
          link.slug !== null,
      )
      .map((link) => ({ path: link.slug }));

    return {
      slug,
      permalink: location.permalink,
      publicLocation: location,
      title: getManifestTitle(slug, processed.frontmatter.title),
      frontmatter: processed.frontmatter,
      html: processed.html,
      tags: uniqueStrings([
        ...normalizeFrontmatterTags(processed.frontmatter.tags),
        ...extractContentTags(markdown),
      ]),
      links,
      backlinks: [],
      assets: uniqueAssets(assets),
    };
  }

  build(
    entries: ContentManifestEntry[],
    contentIndex: Map<string, string>,
  ): ContentManifest {
    const bySlug = new Map(entries.map((entry) => [entry.slug, entry]));
    const byPermalink = new Map(
      entries.map((entry) => [entry.permalink, entry]),
    );
    const byTag = new Map<string, ContentManifestEntry[]>();
    const byAsset = new Map<string, ContentManifestEntry[]>();
    const outgoingLinks = new Map<string, ContentLink[]>();
    const incomingLinks = new Map<string, string[]>();

    for (const entry of entries) {
      outgoingLinks.set(entry.slug, entry.links);

      for (const tag of entry.tags) appendToMap(byTag, tag, entry);
      for (const asset of entry.assets) appendToMap(byAsset, asset.path, entry);

      for (const link of entry.links) {
        if (link.kind !== "note" || !link.slug || link.slug === entry.slug) {
          continue;
        }
        appendUniqueToMap(incomingLinks, link.slug, entry.slug);
      }
    }

    for (const entry of entries) {
      entry.backlinks = incomingLinks.get(entry.slug) ?? [];
    }

    const manifest = {
      entries,
      bySlug,
      byPermalink,
      redirects: new Map(),
      byTag,
      byAsset,
      outgoingLinks,
      incomingLinks,
      contentIndex,
      assets: [],
      diagnostics: [],
    };
    return { ...manifest, graph: createContentGraph(manifest) };
  }
}

function getManifestTitle(slug: string, title: unknown): string {
  return typeof title === "string" && title.trim() ? title : slug;
}

function uniqueAssets(assets: ContentAsset[]): ContentAsset[] {
  return Array.from(
    new Map(assets.map((asset) => [asset.path, asset])).values(),
  );
}

function appendToMap<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const values = map.get(key) ?? [];
  values.push(value);
  map.set(key, values);
}

function appendUniqueToMap<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const values = map.get(key) ?? [];
  if (!values.includes(value)) values.push(value);
  map.set(key, values);
}
