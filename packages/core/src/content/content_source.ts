export type ContentSourceMetadata = {
  readonly createdAt?: number;
  readonly modifiedAt?: number;
  readonly size?: number;
  readonly etag?: string;
  readonly hash?: string;
};

export type ContentSourceEntry = {
  readonly path: string;
  readonly metadata?: ContentSourceMetadata;
};

export type ContentSourceContent = string | Uint8Array;

export interface ContentSource {
  scan(): Promise<readonly ContentSourceEntry[]>;
  read(entry: ContentSourceEntry): Promise<ContentSourceContent>;
}

export function cacheContentSource(source: ContentSource): ContentSource {
  let entries: Promise<readonly ContentSourceEntry[]> | null = null;
  const contents = new Map<string, Promise<ContentSourceContent>>();

  return {
    scan: async () => {
      entries ??= source.scan().catch((error) => {
        entries = null;
        throw error;
      });
      return await entries;
    },
    async read(entry) {
      const cached = contents.get(entry.path);
      if (cached) return await cached;

      const content = source.read(entry).catch((error) => {
        contents.delete(entry.path);
        throw error;
      });
      contents.set(entry.path, content);
      return await content;
    },
  };
}

export async function readContentSourceEntry(
  source: ContentSource,
  logicalPath: string,
): Promise<ContentSourceContent | null> {
  const entry = await getContentSourceEntry(source, logicalPath);
  return entry ? await source.read(entry) : null;
}

export async function getContentSourceEntry(
  source: ContentSource,
  logicalPath: string,
): Promise<ContentSourceEntry | null> {
  return (
    (await source.scan()).find((candidate) => candidate.path === logicalPath) ??
    null
  );
}

export async function getContentSourceEntrySize(
  source: ContentSource,
  logicalPath: string,
): Promise<number | null> {
  const entry = await getContentSourceEntry(source, logicalPath);
  if (!entry) return null;
  if (typeof entry.metadata?.size === "number") return entry.metadata.size;

  const content = await source.read(entry);
  return typeof content === "string"
    ? Buffer.byteLength(content, "utf8")
    : content.byteLength;
}
