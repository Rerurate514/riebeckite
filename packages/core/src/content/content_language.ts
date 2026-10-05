import type { ContentManifestEntry } from "../types/content_manifest.js";

export function getEntryLanguage(
  entry: ContentManifestEntry,
): string | undefined {
  return entry.publicLocation.language;
}

export function selectEntriesByLanguage(
  entries: readonly ContentManifestEntry[],
  language: string | undefined,
): readonly ContentManifestEntry[] {
  if (!language) {
    return entries;
  }
  const localized = entries.filter(
    (entry) => getEntryLanguage(entry) !== undefined,
  );
  if (localized.length === 0) {
    return entries;
  }
  return localized.filter((entry) => getEntryLanguage(entry) === language);
}
