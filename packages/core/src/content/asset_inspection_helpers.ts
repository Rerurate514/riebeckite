import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest.js";
import { normalizeContentPath } from "./attachment.js";

export const DEFAULT_LARGE_ASSET_BYTES = 512 * 1024;

export const MODERN_FORMAT_BYTES = 100 * 1024;

export const LEGACY_IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "bmp",
]);

export type ContentAssetUsage = "used" | "possibly-unused" | "unused";

export type ContentAssetDuplicateGroup = {
  readonly hash: string;
  readonly size: number;
  readonly paths: readonly string[];
};

export type ContentAssetOptimization = {
  readonly path: string;
  readonly size: number;
  readonly kind: "large" | "modern-format";
  readonly recommendation: string;
};

export type ContentAssetFormatSummary = {
  readonly extension: string;
  readonly kind: "image" | "asset";
  readonly count: number;
  readonly bytes: number;
};

export type ContentAssetInspectionOptions = {
  readonly largeAssetBytes?: number;
  readonly isContentPath?: (path: string) => boolean;
  readonly contentDependencies?: ReadonlyMap<string, readonly string[]>;
};

export function referencedBy(
  entries: readonly ContentManifestEntry[] | undefined,
): readonly ContentManifestEntry[] {
  return entries ?? [];
}

export function collectDependencyReferences(
  manifest: ContentManifest,
  dependencies: ReadonlyMap<string, readonly string[]> | undefined,
): ReadonlyMap<string, readonly ContentManifestEntry[]> {
  const references = new Map<string, ContentManifestEntry[]>();
  if (!dependencies) return references;
  const entriesByPath = new Map(
    manifest.entries.flatMap((entry) =>
      entry.sourcePath
        ? [[normalizeContentPath(entry.sourcePath), entry] as const]
        : [],
    ),
  );
  for (const [sourcePath, paths] of dependencies) {
    const source = entriesByPath.get(normalizeContentPath(sourcePath));
    if (!source) continue;
    for (const dependencyPath of paths) {
      const key = normalizeContentPath(dependencyPath);
      const values = references.get(key) ?? [];
      values.push(source);
      references.set(key, values);
    }
  }
  return references;
}
