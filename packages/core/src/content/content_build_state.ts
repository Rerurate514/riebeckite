import type { BuildProvenance } from "../provenance/provenance.js";
import type { ContentManifestEntry } from "../types/content_manifest.js";
import type { ContentSourceEntry } from "./content_source.js";
import type { OutputDescriptor } from "./output_dependency.js";

export const CONTENT_BUILD_STATE_VERSION = 21;

/**
 * Build state lives under `<content directory>/.riebeckite`. That directory is
 * build-time state, not content, so content sources must exclude it from scans
 * to avoid treating the state file itself as a changed content entry.
 */
export const CONTENT_BUILD_STATE_DIRECTORY = ".riebeckite";

export const CONTENT_BUILD_STATE_EXCLUDE = `${CONTENT_BUILD_STATE_DIRECTORY}/**`;

type ContentBuildEntry = {
  readonly fingerprint: string;
  readonly aliases: readonly string[];
  readonly dependencies: readonly ContentBuildDependency[];
  readonly linkTargets?: readonly string[];
  readonly processedContentCacheFingerprint?: string;
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
  readonly externalDependencies?: readonly PersistedExternalDependency[];
  readonly manifestHookCache?: readonly ManifestHookCacheEntry[];
  readonly nextPublishingChangeAt?: string;
  readonly provenance?: BuildProvenance;
};

export type ManifestHookCacheEntry = {
  readonly pluginName: string;
  readonly cacheVersion: string;
  readonly cacheable: boolean;
  readonly pipelineFingerprint: string | undefined;
  readonly inputFingerprint: string;
  readonly outputFingerprint?: string;
  readonly snapshot?: ManifestHookSnapshot;
};

export type ManifestHookSnapshot = {
  readonly entries: readonly ContentManifestEntry[];
  readonly order?: readonly string[];
};

export type PersistedExternalDependency = {
  readonly id: string;
  readonly fingerprint: string;
  readonly scope: import("../types/external_dependency.js").ExternalDependencyScope;
  readonly expiresAt?: string;
};

export type FingerprintedContentEntry = {
  readonly entry: ContentSourceEntry;
  readonly fingerprint: string;
};
