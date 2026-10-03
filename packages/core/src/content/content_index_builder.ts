import { extractFrontmatterAliases } from "./content_metadata.js";
import type { ContentSource, ContentSourceEntry } from "./content_source.js";

export class ContentIndexBuilder {
  constructor(private source: ContentSource) {}

  async build(
    contentEntries: readonly ContentSourceEntry[],
    read = (entry: ContentSourceEntry) => this.source.read(entry),
  ): Promise<Map<string, string>> {
    const index = new Map<string, string>();

    for (const contentEntry of contentEntries) {
      await this.indexContentEntry(index, contentEntry, read);
    }

    return index;
  }

  static buildFromAliases(
    contentEntries: readonly ContentSourceEntry[],
    aliasesByPath: ReadonlyMap<string, readonly string[]>,
  ): Map<string, string> {
    const index = new Map<string, string>();

    for (const contentEntry of contentEntries) {
      ContentIndexBuilder.indexContentEntryFromAliases(
        index,
        contentEntry,
        aliasesByPath.get(contentEntry.path) ?? [],
      );
    }

    return index;
  }

  private async indexContentEntry(
    index: Map<string, string>,
    contentEntry: ContentSourceEntry,
    read: (entry: ContentSourceEntry) => Promise<string | Uint8Array>,
  ) {
    const aliases = contentEntry.path.toLowerCase().endsWith(".md")
      ? extractFrontmatterAliases(readText(await read(contentEntry)))
      : [];
    ContentIndexBuilder.indexContentEntryFromAliases(
      index,
      contentEntry,
      aliases,
    );
  }

  private static indexContentEntryFromAliases(
    index: Map<string, string>,
    contentEntry: ContentSourceEntry,
    aliases: readonly string[],
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
      for (const alias of aliases) addIndexEntry(index, alias, value);
    }
  }
}

function readText(content: string | Uint8Array): string {
  return typeof content === "string"
    ? content
    : new TextDecoder().decode(content);
}

function addIndexEntry(index: Map<string, string>, key: string, value: string) {
  const normalizedKey = key.toLowerCase();
  if (!index.has(normalizedKey)) index.set(normalizedKey, value);
}
