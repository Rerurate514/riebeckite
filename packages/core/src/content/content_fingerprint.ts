import { createHash } from "node:crypto";
import type { FingerprintedContentEntry } from "./content_build_state";
import type {
  ContentSourceContent,
  ContentSourceEntry,
} from "./content_source";

export async function fingerprintContentEntries(
  entries: readonly ContentSourceEntry[],
  read: (entry: ContentSourceEntry) => Promise<ContentSourceContent>,
): Promise<readonly FingerprintedContentEntry[]> {
  return await Promise.all(
    [...entries]
      .sort((left, right) => left.path.localeCompare(right.path))
      .map(async (entry) => ({
        entry,
        fingerprint: await fingerprintContentEntry(entry, read),
      })),
  );
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
