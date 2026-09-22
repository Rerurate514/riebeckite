import fs from "node:fs/promises";
import path from "node:path";
import { isExcluded } from "../config";
import type { PipelineOptions } from "../pipeline";
import { Pipeline } from "../pipeline";
import type { PostContent } from "../types/post_content";
import { IMAGE_EXTENSIONS } from "./image_extensions";

const WIKILINK_PATTERN = /!?\[\[([^\]|#^]+)(?:[#^][^\]|]+)?(?:\|[^\]]+)?\]\]/g;

export type Backlink = {
  slug: string;
};

export class ContentManager {
  private contentIndex: Map<string, string> | null = null;
  private contentCache = new Map<string, PostContent>();
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

  async getBacklinks(targetSlug: string): Promise<Backlink[]> {
    const [posts, contentIndex] = await Promise.all([
      this.getAllPosts(),
      this.getContentIndex(),
    ]);

    const backlinks = await Promise.all(
      posts
        .filter((post) => post.slug !== targetSlug)
        .map(async (post) => {
          const rawPost = await this.getPost(post.slug);
          if (!linksToTarget(rawPost, targetSlug, contentIndex)) return null;
          return { slug: post.slug };
        }),
    );

    return backlinks.filter(
      (backlink): backlink is Backlink => backlink !== null,
    );
  }
}

function linksToTarget(
  markdown: string,
  targetSlug: string,
  contentIndex: Map<string, string>,
): boolean {
  WIKILINK_PATTERN.lastIndex = 0;

  for (
    let match = WIKILINK_PATTERN.exec(markdown);
    match !== null;
    match = WIKILINK_PATTERN.exec(markdown)
  ) {
    const rawTarget = match[1]?.trim().toLowerCase();
    if (!rawTarget) continue;

    if (contentIndex.get(rawTarget) === targetSlug) return true;
  }

  return false;
}
