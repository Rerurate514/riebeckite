export type ContentSourceMetadata = {
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
