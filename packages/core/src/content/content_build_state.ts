import type { ContentSourceEntry } from "./content_source.js";

export const CONTENT_BUILD_STATE_VERSION = 2;

/**
 * Build state lives under `<content directory>/.riebeckite`. That directory is
 * build-time state, not content, so content sources must exclude it from scans
 * to avoid treating the state file itself as a changed content entry.
 */
export const CONTENT_BUILD_STATE_DIRECTORY = ".riebeckite";

export const CONTENT_BUILD_STATE_EXCLUDE = `${CONTENT_BUILD_STATE_DIRECTORY}/**`;

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
