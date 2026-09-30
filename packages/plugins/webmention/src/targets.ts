import type {
  ContentManifest,
  ContentManifestEntry,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import {
  normalizeWebmentionUrl,
  resolvePublicUrl,
  urlComparisonKey,
} from "./url.js";

/**
 * Resolves an entry's public URL. Relative permalinks need the configured
 * base URL; without one, only an already-absolute permalink can be matched.
 */
export function entryPublicUrl(
  entry: ContentManifestEntry,
  config: ResolvedRiebeckiteConfig | undefined,
): string | null {
  if (config?.site.baseUrl) {
    return resolvePublicUrl(entry.permalink, config.site.baseUrl);
  }
  return normalizeWebmentionUrl(entry.permalink);
}

/** Finds the content entry whose public URL matches `target`, if any. */
export function findTargetEntry(
  manifest: ContentManifest,
  config: ResolvedRiebeckiteConfig | undefined,
  target: string,
): ContentManifestEntry | undefined {
  const key = urlComparisonKey(target);
  for (const entry of manifest.entries) {
    const publicUrl = entryPublicUrl(entry, config);
    if (publicUrl !== null && urlComparisonKey(publicUrl) === key) return entry;
  }
  return undefined;
}

/** Whether `target` is explicitly allowed by `allowedTargets`. */
export function isAllowedTarget(
  target: string,
  allowedTargets: readonly string[],
  config: ResolvedRiebeckiteConfig | undefined,
): boolean {
  const key = urlComparisonKey(target);
  for (const candidate of allowedTargets) {
    const resolved = config?.site.baseUrl
      ? resolvePublicUrl(candidate, config.site.baseUrl)
      : normalizeWebmentionUrl(candidate);
    if (resolved !== null && urlComparisonKey(resolved) === key) return true;
  }
  return false;
}
