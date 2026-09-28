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
