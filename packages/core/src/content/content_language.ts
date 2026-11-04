import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest.js";

type LocalizableEntry = Pick<ContentManifestEntry, "slug" | "publicLocation">;

export const CONTENT_TRANSLATION_ID_METADATA_KEY = "l10n.translationId";

export type ContentLocalizationMode = "current" | "fallback" | "all";

export type ContentLocalePolicy = {
  mode: ContentLocalizationMode;
  locale?: string;
  fallbackLocale?: string;
};

export type ContentLocalization = {
  defaultLocale: string;
  locales: readonly string[];
  fallbackLocale?: string;
};

export function getEntryLanguage(entry: LocalizableEntry): string | undefined {
  return entry.publicLocation.language;
}

export function getEntryTranslationId(
  entry: LocalizableEntry,
): string | undefined {
  return entry.publicLocation.metadata?.[CONTENT_TRANSLATION_ID_METADATA_KEY];
}

export function selectEntriesByLanguage<Entry extends LocalizableEntry>(
  entries: readonly Entry[],
  language: string | undefined,
): readonly Entry[] {
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

/**
 * Selects entries for a page language without changing their identity.
 *
 * `all` returns every entry unchanged. `current` keeps the page language.
 * `fallback` keeps the page language per translation group and uses the
 * fallback locale only for groups with no page-language entry. Entries without
 * a language are language-neutral and always kept. When the site has no
 * localization metadata, every entry is returned so l10n-disabled sites are
 * unaffected.
 */
export function selectLocalizedEntries<Entry extends LocalizableEntry>(
  entries: readonly Entry[],
  policy: ContentLocalePolicy,
): readonly Entry[] {
  if (policy.mode === "all" || !policy.locale) return entries;
  if (!entries.some((entry) => getEntryLanguage(entry) !== undefined)) {
    return entries;
  }
  if (policy.mode === "current") {
    return entries.filter(
      (entry) =>
        getEntryLanguage(entry) === undefined ||
        getEntryLanguage(entry) === policy.locale,
    );
  }

  const groups = new Map<string, Entry[]>();
  for (const entry of entries) {
    const key =
      getEntryTranslationId(entry) === undefined
        ? `slug:${entry.slug}`
        : `translation:${getEntryTranslationId(entry)}`;
    const group = groups.get(key);
    if (group) group.push(entry);
    else groups.set(key, [entry]);
  }

  if (
    !policy.fallbackLocale &&
    [...groups.values()].some(
      (group) =>
        group.some((entry) => getEntryLanguage(entry) !== undefined) &&
        !group.some((entry) => getEntryLanguage(entry) === policy.locale),
    )
  ) {
    throw new Error(
      `Content locale policy requires fallbackLocale to select translations missing from ${policy.locale}.`,
    );
  }

  const selected = new Set<string>();
  for (const group of groups.values()) {
    const neutral = group.filter(
      (entry) => getEntryLanguage(entry) === undefined,
    );
    const current = group.filter(
      (entry) => getEntryLanguage(entry) === policy.locale,
    );
    const fallback = policy.fallbackLocale
      ? group.filter(
          (entry) => getEntryLanguage(entry) === policy.fallbackLocale,
        )
      : [];
    for (const entry of [
      ...neutral,
      ...current,
      ...(current.length === 0 ? fallback : []),
    ]) {
      selected.add(entry.slug);
    }
  }
  return entries.filter((entry) => selected.has(entry.slug));
}

export function resolvePageLocale(
  manifest: Pick<ContentManifest, "localization">,
  pathname: string,
): string | undefined {
  const localization = manifest.localization;
  if (!localization) return undefined;
  const first = pathname.split("/").filter(Boolean)[0];
  if (first) {
    const match = localization.locales.find(
      (locale) => locale.toLowerCase() === first.toLowerCase(),
    );
    if (match) return match;
  }
  return localization.defaultLocale;
}

export function localizedPagePath(
  localization: ContentLocalization | undefined,
  pathname: string,
  locale: string,
): string {
  if (!localization || locale === localization.defaultLocale) return pathname;
  return `/${locale}${pathname === "/" ? "" : pathname}`;
}

export function localizedPagePaths(
  manifest: Pick<ContentManifest, "localization">,
  pathname: string,
): readonly string[] {
  const localization = manifest.localization;
  if (!localization) return [pathname];
  return localization.locales.map((locale) =>
    localizedPagePath(localization, pathname, locale),
  );
}
