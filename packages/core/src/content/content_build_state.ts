import type { ContentManifestEntry } from "../types/content_manifest.js";
import type { ContentSourceEntry } from "./content_source.js";
import type { OutputDescriptor } from "./output_dependency.js";

export const CONTENT_BUILD_STATE_VERSION = 7;

/**
 * Build state lives under `<content directory>/.riebeckite`. That directory is
 * build-time state, not content, so content sources must exclude it from scans
 * to avoid treating the state file itself as a changed content entry.
 */
export const CONTENT_BUILD_STATE_DIRECTORY = ".riebeckite";

export const CONTENT_BUILD_STATE_EXCLUDE = `${CONTENT_BUILD_STATE_DIRECTORY}/**`;

export type ContentBuildEntry = {
  readonly fingerprint: string;
  readonly aliases: readonly string[];
  readonly dependencies: readonly ContentBuildDependency[];
  readonly linkTargets?: readonly string[];
};

export type ContentBuildDependency = {
  readonly kind: "content" | "file";
  readonly id: string;
};

export type ContentBuildState = {
  readonly version: number;
  readonly entries: Readonly<Record<string, ContentBuildEntry>>;
  readonly contentIndex: Readonly<Record<string, string>>;
  readonly pipelineFingerprint?: string;
  readonly manifestEntries?: readonly ContentManifestEntry[];
  readonly outputs?: readonly OutputDescriptor[];
};

export type FingerprintedContentEntry = {
  readonly entry: ContentSourceEntry;
  readonly fingerprint: string;
};
