import type { ContentSourceEntry } from "./content_source.js";

export const CONTENT_BUILD_STATE_VERSION = 1;

export type ContentBuildEntry = {
  readonly fingerprint: string;
  readonly dependencies: readonly string[];
};

export type ContentBuildState = {
  readonly version: number;
  readonly entries: Readonly<Record<string, ContentBuildEntry>>;
  readonly contentIndex: Readonly<Record<string, string>>;
};

export type FingerprintedContentEntry = {
  readonly entry: ContentSourceEntry;
  readonly fingerprint: string;
};
