import crypto from "node:crypto";
import { mapConcurrent } from "../utils/concurrency.js";
import type { FingerprintedContentEntry } from "./content_build_state.js";
import type {
  ContentSourceContent,
  ContentSourceEntry,
} from "./content_source.js";

export async function fingerprintContentEntries(
  entries: readonly ContentSourceEntry[],
  read: (entry: ContentSourceEntry) => Promise<ContentSourceContent>,
  includeMetadata = true,
  previousEntries?: Readonly<
    Record<
      string,
      { readonly fingerprint: string; readonly metadataFingerprint?: string }
    >
  >,
  isContentPath: (path: string) => boolean = (path) =>
    path.toLowerCase().endsWith(".md"),
): Promise<readonly FingerprintedContentEntry[]> {
  const sortedEntries = [...entries].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  return await mapConcurrent(sortedEntries, 64, async (entry) => ({
    entry,
    fingerprint: await fingerprintContentEntry(
      entry,
      read,
      includeMetadata,
      previousEntries?.[entry.path],
      isContentPath,
    ),
  }));
}

async function fingerprintContentEntry(
  entry: ContentSourceEntry,
  read: (entry: ContentSourceEntry) => Promise<ContentSourceContent>,
  includeMetadata: boolean,
  previousEntry:
    | {
        readonly fingerprint: string;
        readonly metadataFingerprint?: string;
      }
    | undefined,
  isContentPath: (path: string) => boolean,
): Promise<string> {
  const metadataFingerprint = fingerprintContentMetadata(entry);
  const contentIdentity = entry.metadata?.hash
    ? `hash:${entry.metadata.hash}`
    : entry.metadata?.etag
      ? `etag:${entry.metadata.etag}`
      : undefined;
  const previousMetadataMatches = includeMetadata
    ? previousEntry?.fingerprint.endsWith(`:${metadataFingerprint}`)
    : previousEntry?.metadataFingerprint === metadataFingerprint;
  if (
    contentIdentity === undefined &&
    entry.metadata !== undefined &&
    previousEntry !== undefined &&
    previousMetadataMatches &&
    !isContentPath(entry.path)
  ) {
    return previousEntry.fingerprint;
  }
  const contentFingerprint =
    contentIdentity ?? (await fingerprintContent(entry, read));
  return includeMetadata
    ? `${contentFingerprint}:${metadataFingerprint}`
    : contentFingerprint;
}

async function fingerprintContent(
  entry: ContentSourceEntry,
  read: (entry: ContentSourceEntry) => Promise<ContentSourceContent>,
): Promise<string> {
  const content = await read(entry);
  return `sha256:${crypto.createHash("sha256").update(content).digest("hex")}`;
}

export function fingerprintContentMetadata(entry: ContentSourceEntry): string {
  const metadata = entry.metadata;
  if (!metadata) return "metadata:none";
  return JSON.stringify({
    createdAt: finiteMetadataValue(metadata.createdAt),
    modifiedAt: finiteMetadataValue(metadata.modifiedAt),
    size: finiteMetadataValue(metadata.size),
  });
}

function finiteMetadataValue(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
