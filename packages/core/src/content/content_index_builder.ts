import { extractFrontmatterAliases } from "./content_metadata.js";
import type { ContentSource, ContentSourceEntry } from "./content_source.js";

export type ContentIndexBuild = {
  readonly index: Map<string, string>;
  readonly ambiguities: ReadonlyMap<string, readonly string[]>;
};

export class ContentIndexBuilder {
  constructor(private source: ContentSource) {}

  async build(
    contentEntries: readonly ContentSourceEntry[],
    read = (entry: ContentSourceEntry) => this.source.read(entry),
  ): Promise<ContentIndexBuild> {
    const candidates = new Map<string, Set<string>>();

    for (const contentEntry of contentEntries) {
      await this.indexContentEntry(candidates, contentEntry, read);
    }

    return resolveContentIndex(candidates);
  }

  static buildFromAliases(
    contentEntries: readonly ContentSourceEntry[],
    aliasesByPath: ReadonlyMap<string, readonly string[]>,
  ): ContentIndexBuild {
    const candidates = new Map<string, Set<string>>();

    for (const contentEntry of contentEntries) {
      ContentIndexBuilder.indexContentEntryFromAliases(
        candidates,
        contentEntry,
        aliasesByPath.get(contentEntry.path) ?? [],
      );
    }

    return resolveContentIndex(candidates);
  }

  private async indexContentEntry(
    candidates: Map<string, Set<string>>,
    contentEntry: ContentSourceEntry,
    read: (entry: ContentSourceEntry) => Promise<string | Uint8Array>,
  ) {
    const aliases = contentEntry.path.toLowerCase().endsWith(".md")
      ? extractFrontmatterAliases(readText(await read(contentEntry)))
      : [];
    ContentIndexBuilder.indexContentEntryFromAliases(
      candidates,
      contentEntry,
      aliases,
    );
  }

  private static indexContentEntryFromAliases(
    candidates: Map<string, Set<string>>,
    contentEntry: ContentSourceEntry,
    aliases: readonly string[],
  ) {
    const contentPath = contentEntry.path;
    const ext = contentPath.split(".").pop()?.toLowerCase() ?? "";
    const value = ext === "md" ? contentPath.replace(/\.md$/, "") : contentPath;
    const parts = value.split("/");

    for (let i = parts.length - 1; i >= 0; i--) {
      const rawSuffix = parts.slice(i).join("/");
      addCandidate(candidates, rawSuffix, value);

      if (ext !== "md") {
        addCandidate(candidates, rawSuffix.replace(/\.[^/.]+$/, ""), value);
      }
    }

    if (ext === "md") {
      for (const alias of aliases) addCandidate(candidates, alias, value);
    }
  }
}

/**
 * Collapses discovered candidates into a resolution index. A key that matched a
 * single candidate resolves to it; a key that matched several candidates is
 * ambiguous and is intentionally absent from the index, with its candidates
 * kept for diagnostics. Selection never depends on discovery order.
 */
function resolveContentIndex(
  candidates: ReadonlyMap<string, ReadonlySet<string>>,
): ContentIndexBuild {
  const index = new Map<string, string>();
  const ambiguities = new Map<string, readonly string[]>();

  for (const [key, values] of candidates) {
    const list = [...values].sort(compareCandidates);
    const [only] = list;
    if (list.length === 1 && only !== undefined) {
      index.set(key, only);
      continue;
    }
    ambiguities.set(key, list);
  }

  return { index, ambiguities };
}

function compareCandidates(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function readText(content: string | Uint8Array): string {
  return typeof content === "string"
    ? content
    : new TextDecoder().decode(content);
}

function addCandidate(
  candidates: Map<string, Set<string>>,
  key: string,
  value: string,
) {
  const normalizedKey = key.toLowerCase();
  const values = candidates.get(normalizedKey) ?? new Set<string>();
  values.add(value);
  candidates.set(normalizedKey, values);
}
