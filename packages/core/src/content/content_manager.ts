import fs from "node:fs/promises";
import path from "node:path";
import { isExcluded } from "../config";
import type { PipelineOptions } from "../pipeline";
import { Pipeline } from "../pipeline";
import type {
  ContentAsset,
  ContentLink,
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest";
import type { PostContent } from "../types/post_content";
import { IMAGE_EXTENSIONS } from "./image_extensions";

const WIKILINK_PATTERN =
  /(!)?\[\[([^\]|#^]+)(?:[#^][^\]|]+)?(?:\|[^\]]+)?\]\]/g;
const TAG_PATTERN = /(^|[\s([{"'])#([\p{L}\p{N}_\-/]+)/gu;

export type Backlink = {
  slug: string;
};

export class ContentManager {
  private contentIndex: Map<string, string> | null = null;
  private contentCache = new Map<string, PostContent>();
  private manifest: ContentManifest | null = null;
  private pipeline: Pipeline | null = null;

  constructor(
    private contentDirectory: string,
    private exclude: string[] = [],
    private pipelineOptions: PipelineOptions = {},
  ) {}

  async getAllPosts(): Promise<{ slug: string }[]> {
    const files = await fs.readdir(this.contentDirectory, { recursive: true });

    return files
      .filter((f) => f.endsWith(".md"))
      .map((f) => {
        const normalizedPath = f.replace(/\\/g, "/");
        const slug = normalizedPath.replace(/\.md$/, "");
        return { slug };
      })
      .filter((post) => !isExcluded(this.exclude, post.slug));
  }

  async getPost(slug: string): Promise<string> {
    const filePath = path.resolve(this.contentDirectory, `${slug}.md`);
    const relative = path.relative(this.contentDirectory, filePath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`Invalid slug: ${slug}`);
    }
    return await fs.readFile(filePath, "utf-8");
  }

  async getContentIndex(): Promise<Map<string, string>> {
    if (this.contentIndex) return this.contentIndex;

    const files = await fs.readdir(this.contentDirectory, { recursive: true });
    const index = new Map<string, string>();

    for (const f of files) {
      const normalizedPath = f.replace(/\\/g, "/");
      if (isExcluded(this.exclude, normalizedPath)) continue;
      const ext = normalizedPath.split(".").pop()?.toLowerCase() ?? "";

      let value: string;
      let parts: string[];

      if (ext === "md") {
        value = normalizedPath.replace(/\.md$/, "");
        parts = value.split("/");
      } else if (IMAGE_EXTENSIONS.includes(ext)) {
        value = normalizedPath;
        parts = normalizedPath.split("/");
      } else {
        continue;
      }

      for (let i = parts.length - 1; i >= 0; i--) {
        const rawSuffix = parts.slice(i).join("/");
        const key = rawSuffix.toLowerCase();

        if (!index.has(key)) {
          index.set(key, value);
        }
      }
    }

    this.contentIndex = index;
    return index;
  }

  async getProcessedContent(slug: string): Promise<PostContent> {
    const cached = this.contentCache.get(slug);
    if (cached) return cached;

    const [contentIndex, rawPost] = await Promise.all([
      this.getContentIndex(),
      this.getPost(slug),
    ]);
    this.pipeline ??= new Pipeline(
      contentIndex,
      (slug) => this.getPost(slug),
      this.pipelineOptions,
    );
    const content = await this.pipeline.execute(rawPost, 0, new Set([slug]));
    this.contentCache.set(slug, content);
    return content;
  }

  async getManifest(): Promise<ContentManifest> {
    if (this.manifest) return this.manifest;

    const [posts, contentIndex] = await Promise.all([
      this.getAllPosts(),
      this.getContentIndex(),
    ]);

    const entries = await Promise.all(
      posts.map(async (post) => {
        const [rawPost, processed] = await Promise.all([
          this.getPost(post.slug),
          this.getProcessedContent(post.slug),
        ]);

        return createManifestEntry(post.slug, rawPost, processed, contentIndex);
      }),
    );

    this.manifest = buildManifest(entries, contentIndex);
    return this.manifest;
  }

  async getBacklinks(targetSlug: string): Promise<Backlink[]> {
    const manifest = await this.getManifest();
    return (manifest.incomingLinks.get(targetSlug) ?? []).map((slug) => ({
      slug,
    }));
  }
}

function createManifestEntry(
  slug: string,
  markdown: string,
  processed: PostContent,
  contentIndex: Map<string, string>,
): ContentManifestEntry {
  const links = extractContentLinks(markdown, contentIndex);
  const assets = links
    .filter(
      (link): link is ContentLink & { slug: string } =>
        link.kind === "asset" && link.slug !== null,
    )
    .map((link) => ({ path: link.slug }));

  return {
    slug,
    title: getManifestTitle(slug, processed.frontmatter.title),
    frontmatter: processed.frontmatter,
    html: processed.html,
    tags: uniqueStrings([
      ...(processed.frontmatter.tags ?? []),
      ...extractContentTags(markdown),
    ]),
    links,
    backlinks: [],
    assets: uniqueAssets(assets),
  };
}

function buildManifest(
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
      if (link.kind !== "note" || !link.slug || link.slug === entry.slug)
        continue;
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
  };
}

function extractContentLinks(
  markdown: string,
  contentIndex: Map<string, string>,
): ContentLink[] {
  WIKILINK_PATTERN.lastIndex = 0;
  const links: ContentLink[] = [];

  for (
    let match = WIKILINK_PATTERN.exec(markdown);
    match !== null;
    match = WIKILINK_PATTERN.exec(markdown)
  ) {
    const rawTarget = match[2]?.trim();
    if (!rawTarget) continue;

    const resolved = contentIndex.get(rawTarget.toLowerCase()) ?? null;
    links.push({
      raw: rawTarget,
      slug: resolved,
      kind: resolved ? linkKind(resolved) : "unresolved",
      embed: match[1] === "!",
    });
  }

  return links;
}

function extractContentTags(markdown: string): string[] {
  TAG_PATTERN.lastIndex = 0;
  const tags: string[] = [];

  for (
    let match = TAG_PATTERN.exec(markdown);
    match !== null;
    match = TAG_PATTERN.exec(markdown)
  ) {
    const tag = normalizeTag(match[2] ?? "");
    if (tag) tags.push(tag);
  }

  return uniqueStrings(tags);
}

function normalizeTag(raw: string): string | null {
  const cleaned = raw.replace(/[/-]+$/, "");
  if (!cleaned) return null;

  const isPurelyNumeric = /^[\p{N}/\-_]+$/u.test(cleaned);
  if (isPurelyNumeric) return null;

  return cleaned;
}

function linkKind(value: string): "note" | "asset" {
  const ext = value.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.includes(ext) ? "asset" : "note";
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
