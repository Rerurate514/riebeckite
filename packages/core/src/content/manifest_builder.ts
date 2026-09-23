import type {
  ContentAsset,
  ContentLink,
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest";
import type { PostContent } from "../types/post_content";
import { extractContentLinks } from "./content_links";
import {
  extractContentTags,
  normalizeFrontmatterTags,
} from "./content_metadata";

export class ManifestBuilder {
  createEntry(
    slug: string,
    markdown: string,
    processed: PostContent,
    contentIndex: Map<string, string>,
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

    return {
      entries,
      bySlug,
      byTag,
      byAsset,
      outgoingLinks,
      incomingLinks,
      contentIndex,
      assets: [],
      diagnostics: [],
    };
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

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
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
