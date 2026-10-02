import { createHash } from "node:crypto";
import type { FingerprintedContentEntry } from "./content_build_state.js";
import type {
  ContentSourceContent,
  ContentSourceEntry,
} from "./content_source.js";

export async function fingerprintContentEntries(
  entries: readonly ContentSourceEntry[],
  read: (entry: ContentSourceEntry) => Promise<ContentSourceContent>,
): Promise<readonly FingerprintedContentEntry[]> {
  const sortedEntries = [...entries].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  return await mapConcurrent(sortedEntries, 64, async (entry) => ({
    entry,
    fingerprint: await fingerprintContentEntry(entry, read),
  }));
}

async function mapConcurrent<T, U>(
  values: readonly T[],
  concurrency: number,
  map: (value: T) => Promise<U>,
): Promise<U[]> {
  const results = new Array<U>(values.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      const value = values[index];
      if (value !== undefined) results[index] = await map(value);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () =>
      worker(),
    ),
  );
  return results;
}

async function fingerprintContentEntry(
  entry: ContentSourceEntry,
  read: (entry: ContentSourceEntry) => Promise<ContentSourceContent>,
): Promise<string> {
  if (entry.metadata?.hash) return `hash:${entry.metadata.hash}`;
  if (entry.metadata?.etag) return `etag:${entry.metadata.etag}`;

  const content = await read(entry);
  return `sha256:${createHash("sha256")
    .update(typeof content === "string" ? content : content)
    .digest("hex")}`;
}
