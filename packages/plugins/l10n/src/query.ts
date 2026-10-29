import type {
  ContentManifest,
  ContentManifestEntry,
  PublicContentEntry,
  PublicContentView,
} from "@riebeckite/core";
import { type LocalizedContent, TRANSLATION_METADATA_KEY } from "./types.js";

export function getLocalization(
  view: ContentManifest | PublicContentView,
  slug: string,
): LocalizedContent | null {
  const entry = findLocalizedEntry(view, slug);
  if (!entry) return null;
  const lang = entry.publicLocation.language;
  const translationId =
    entry.publicLocation.metadata?.[TRANSLATION_METADATA_KEY];
  if (!lang || !translationId) return null;
  const candidates = view.discoverableEntries.filter(
    (candidate) =>
      candidate.publicLocation.metadata?.[TRANSLATION_METADATA_KEY] ===
      translationId,
  );
  const translations = Object.fromEntries(
    uniqueLanguageEntries(candidates).map((candidate) => [
      candidate.publicLocation.language ?? "",
      candidate.permalink,
    ]),
  );
  return {
    slug,
    permalink: entry.permalink,
    lang,
    translationId,
    availableLanguages: Object.keys(translations).sort(),
    translations,
  };
}

export function getLocalizedContent(
  manifest: ContentManifest,
  slug: string,
  lang: string,
): ContentManifestEntry | null {
  const localization = getLocalization(manifest, slug);
  if (!localization) return null;
  const candidates = manifest.publicEntries.filter(
    (entry) =>
      entry.publicLocation.metadata?.[TRANSLATION_METADATA_KEY] ===
        localization.translationId && entry.publicLocation.language === lang,
  );
  return candidates.length === 1 ? (candidates[0] ?? null) : null;
}

export function getLanguageFromPath(
  manifest: ContentManifest,
  pathname: string,
): string | undefined {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  if (!firstSegment) return undefined;
  return manifest.discoverableEntries
    .map((entry) => entry.publicLocation.language)
    .find(
      (language) =>
        language?.toLocaleLowerCase() === firstSegment.toLocaleLowerCase(),
    );
}

function findLocalizedEntry(
  view: ContentManifest | PublicContentView,
  slug: string,
): ContentManifestEntry | PublicContentEntry | undefined {
  return "findRoutableBySlug" in view
    ? view.findRoutableBySlug(slug)
    : view.bySlug.get(slug);
}

function uniqueLanguageEntries<
  Entry extends ContentManifestEntry | PublicContentEntry,
>(entries: readonly Entry[]): readonly Entry[] {
  const entriesByLanguage = new Map<string, Entry[]>();
  for (const entry of entries) {
    const language = entry.publicLocation.language;
    if (!language) continue;
    const candidates = entriesByLanguage.get(language) ?? [];
    candidates.push(entry);
    entriesByLanguage.set(language, candidates);
  }
  return [...entriesByLanguage.values()]
    .filter((candidates) => candidates.length === 1)
    .flatMap((candidates) => (candidates[0] ? [candidates[0]] : []));
}
