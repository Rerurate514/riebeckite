import { extractFrontmatterAliases } from "./content_metadata";
import type { ContentRepository } from "./content_repository";

export class ContentIndexBuilder {
  constructor(private repository: ContentRepository) {}

  async build(): Promise<Map<string, string>> {
    const index = new Map<string, string>();
    const contentPaths = await this.repository.getContentPaths();

    for (const contentPath of contentPaths) {
      await this.indexContentPath(index, contentPath);
    }

    return index;
  }

  private async indexContentPath(
    index: Map<string, string>,
    contentPath: string,
  ) {
    const ext = contentPath.split(".").pop()?.toLowerCase() ?? "";
    const value = ext === "md" ? contentPath.replace(/\.md$/, "") : contentPath;
    const parts = value.split("/");

    for (let i = parts.length - 1; i >= 0; i--) {
      const rawSuffix = parts.slice(i).join("/");
      addIndexEntry(index, rawSuffix, value);

      if (ext !== "md") {
        addIndexEntry(index, rawSuffix.replace(/\.[^/.]+$/, ""), value);
      }
    }

    if (ext === "md") {
      const markdown = await this.repository.getContentFile(contentPath);
      for (const alias of extractFrontmatterAliases(markdown)) {
        addIndexEntry(index, alias, value);
      }
    }
  }
}

function addIndexEntry(index: Map<string, string>, key: string, value: string) {
  const normalizedKey = key.toLowerCase();
  if (!index.has(normalizedKey)) index.set(normalizedKey, value);
}
