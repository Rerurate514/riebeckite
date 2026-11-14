import type {
  ContentMutationFileChange,
  ContentSource,
  ContentSourceEntry,
} from "@riebeckite/core";
import { fingerprintFiles } from "./file_system_content_migration_helpers.js";
import type { FutureContentSource } from "./file_system_content_migration_types.js";

export function createFutureContentSource(
  base: ContentSource,
  changes: readonly ContentMutationFileChange[],
): FutureContentSource {
  const map = new Map<string, Uint8Array | null>();
  for (const change of changes) map.set(change.path, change.content);
  return {
    changes: map,
    async scan(): Promise<ContentSourceEntry[]> {
      const entries = new Map<string, ContentSourceEntry>();
      for (const entry of await base.scan()) entries.set(entry.path, entry);
      for (const [changePath, content] of map) {
        if (content === null) entries.delete(changePath);
        else
          entries.set(changePath, {
            path: changePath,
            metadata: entries.get(changePath)?.metadata,
          });
      }
      return [...entries.values()].sort((left, right) =>
        left.path.localeCompare(right.path),
      );
    },
    async read(entry: ContentSourceEntry): Promise<string | Uint8Array> {
      const content = map.get(entry.path);
      if (content === null)
        throw new Error(`The content path "${entry.path}" was deleted.`);
      if (content !== undefined) return content;
      return await base.read(entry);
    },
  };
}

export function fingerprintContentFiles(
  files: readonly {
    readonly path: string;
    readonly content: string | Uint8Array;
  }[],
): string {
  return fingerprintFiles(files);
}
