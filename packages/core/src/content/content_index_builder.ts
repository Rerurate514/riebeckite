import { extractFrontmatterAliases } from "./content_metadata";
import type { ContentSource, ContentSourceEntry } from "./content_source";

export class ContentIndexBuilder {
  constructor(private source: ContentSource) {}

  async build(
    contentEntries: readonly ContentSourceEntry[],
  ): Promise<Map<string, string>> {
    const index = new Map<string, string>();

    for (const contentEntry of contentEntries) {
      await this.indexContentEntry(index, contentEntry);
    }

    return index;
  }

  private async indexContentEntry(
    index: Map<string, string>,
    contentEntry: ContentSourceEntry,
  ) {
    const contentPath = contentEntry.path;
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
      const markdown = readText(await this.source.read(contentEntry));
      for (const alias of extractFrontmatterAliases(markdown)) {
        addIndexEntry(index, alias, value);
      }
    }
  }
}

function readText(content: string | Uint8Array): string {
  return typeof content === "string" ? content : new TextDecoder().decode(content);
}

function addIndexEntry(index: Map<string, string>, key: string, value: string) {
  const normalizedKey = key.toLowerCase();
  if (!index.has(normalizedKey)) index.set(normalizedKey, value);
}
