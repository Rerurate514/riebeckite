import fs from "node:fs/promises";
import path from "node:path";
import { isExcluded } from "../config";

export type ContentPostReference = {
  slug: string;
};

export class ContentRepository {
  constructor(
    private contentDirectory: string,
    private exclude: string[] = [],
  ) {}

  async getAllPosts(): Promise<ContentPostReference[]> {
    const files = await this.listContentPaths();

    return files
      .filter((filePath) => filePath.endsWith(".md"))
      .map((filePath) => ({ slug: filePath.replace(/\.md$/, "") }))
      .filter((post) => !isExcluded(this.exclude, post.slug));
  }

  async getPost(slug: string): Promise<string> {
    const filePath = this.resolveContentPath(
      `${slug}.md`,
      `Invalid slug: ${slug}`,
    );
    return await fs.readFile(filePath, "utf-8");
  }

  async getContentPaths(): Promise<string[]> {
    const paths = await this.listContentPaths();
    return paths.filter(
      (contentPath) => !isExcluded(this.exclude, contentPath),
    );
  }

  async getContentFile(contentPath: string): Promise<string> {
    return await fs.readFile(this.resolveContentPath(contentPath), "utf-8");
  }

  private async listContentPaths(): Promise<string[]> {
    const files = await fs.readdir(this.contentDirectory, { recursive: true });
    return files.map((filePath) => filePath.replace(/\\/g, "/"));
  }

  private resolveContentPath(
    contentPath: string,
    invalidPathMessage = `Invalid content path: ${contentPath}`,
  ): string {
    const filePath = path.resolve(this.contentDirectory, contentPath);
    const relative = path.relative(this.contentDirectory, filePath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(invalidPathMessage);
    }
    return filePath;
  }
}
