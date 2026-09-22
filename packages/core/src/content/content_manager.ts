import fs from "node:fs/promises";
import path from "node:path";
import { isExcluded } from "../config";
import { Pipeline } from "../pipeline";
import type { PostContent } from "../types/post_content";
import { IMAGE_EXTENSIONS } from "./image_extensions";

export class ContentManager {
  private contentIndex: Map<string, string> | null = null;
  private contentCache = new Map<string, PostContent>();
  private pipeline: Pipeline | null = null;

  constructor(
    private contentDirectory: string,
    private exclude: string[] = [],
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
    this.pipeline ??= new Pipeline(contentIndex, (slug) => this.getPost(slug));
    const content = await this.pipeline.execute(rawPost, 0, new Set([slug]));
    this.contentCache.set(slug, content);
    return content;
  }
}
