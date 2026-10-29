import type {
  ContentManifest,
  ContentManifestEntry,
  PluginHeadTag,
} from "@riebeckite/core";
import { type L10nState, TRANSLATION_METADATA_KEY } from "./types.js";

export function addLocalizationHeadTags(
  manifest: ContentManifest,
  state: L10nState,
): void {
  const translationsById = collectDiscoverableTranslations(manifest);
  for (const entry of manifest.discoverableEntries) {
    const content = state.contents.get(entry.slug);
    if (!content) continue;
    const translations = translationsById.get(content.translationId) ?? [];
    const headTags = translations.map(
      (translation): PluginHeadTag => ({
        tag: "link",
        attrs: {
          rel: "alternate",
          hreflang: translation.publicLocation.language ?? "",
          href: translation.permalink,
        },
      }),
    );
    entry.headTags = [
      ...(entry.headTags ?? []).filter(
        (tag) => !headTags.some((generated) => sameHeadTag(tag, generated)),
      ),
      ...headTags,
    ];
  }
}

function collectDiscoverableTranslations(
  manifest: ContentManifest,
): ReadonlyMap<string, readonly ContentManifestEntry[]> {
  const candidatesById = new Map<string, ContentManifestEntry[]>();
  for (const entry of manifest.discoverableEntries) {
    const translationId =
      entry.publicLocation.metadata?.[TRANSLATION_METADATA_KEY];
    if (!translationId) continue;
    const candidates = candidatesById.get(translationId) ?? [];
    candidates.push(entry);
    candidatesById.set(translationId, candidates);
  }
  return new Map(
    [...candidatesById].map(([translationId, candidates]) => [
      translationId,
      uniqueLanguageEntries(candidates),
    ]),
  );
}

function sameHeadTag(left: PluginHeadTag, right: PluginHeadTag): boolean {
  return (
    left.tag === right.tag &&
    left.attrs?.rel === right.attrs?.rel &&
    left.attrs?.hreflang === right.attrs?.hreflang &&
    left.attrs?.href === right.attrs?.href
  );
}

function uniqueLanguageEntries<Entry extends ContentManifestEntry>(
  entries: readonly Entry[],
): readonly Entry[] {
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
