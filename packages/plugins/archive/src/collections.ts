import {
  buildContentCollections,
  type ContentCollection,
  type ContentCollectionDefinition,
  type ContentManifest,
  type ContentManifestEntry,
  localizedPagePath,
  selectLocalizedEntries,
} from "@riebeckite/core";
import { formatArchivePeriod } from "./locale.js";
import type { ResolvedArchiveOptions } from "./types.js";

export const ARCHIVE_COLLECTION_KIND = "archive";

export function archiveDefinitions(
  options: ResolvedArchiveOptions,
  locale: string,
  fallbackLocale?: string,
): readonly ContentCollectionDefinition[] {
  return [
    {
      kind: ARCHIVE_COLLECTION_KIND,
      basePath: options.basePath,
      locale: {
        mode: options.localeMode,
        locale,
        ...(fallbackLocale ? { fallbackLocale } : {}),
      },
      groupBy: {
        by: "date",
        fields: ["published", "date", "created"],
        granularity: "month",
      },
      order: "desc",
      pageSize: options.pageSize,
      resolveTitle: ({ value }) => formatArchivePeriod(value, locale),
      resolvePath: ({ value }) =>
        `${options.basePath}/${value.replace(/-/g, "/")}`,
    },
  ];
}

export function buildArchiveCollections(
  entries: readonly ContentManifestEntry[],
  options: ResolvedArchiveOptions,
  locale: string,
  fallbackLocale?: string,
): ContentCollection[] {
  if (options.basePath === "") return [];
  return buildContentCollections(
    entries,
    archiveDefinitions(options, locale, fallbackLocale),
  );
}

export type ArchivePages = {
  readonly locale: string;
  readonly collections: readonly ContentCollection[];
};

export function buildArchivePages(
  manifest: ContentManifest,
  options: ResolvedArchiveOptions,
  siteLocale: string,
): readonly ArchivePages[] {
  if (options.basePath === "") return [];
  const localization = manifest.localization;
  if (!localization) {
    return [
      {
        locale: siteLocale,
        collections: buildArchiveCollections(
          manifest.discoverableEntries,
          options,
          siteLocale,
        ),
      },
    ];
  }
  const locales =
    options.localeMode === "all"
      ? [localization.defaultLocale]
      : localization.locales;
  return locales.flatMap((locale) => {
    const entries = selectLocalizedEntries(manifest.discoverableEntries, {
      mode: options.localeMode,
      locale,
      ...(localization.fallbackLocale
        ? { fallbackLocale: localization.fallbackLocale }
        : {}),
    });
    const collections = buildArchiveCollections(
      entries,
      options,
      locale,
      localization.fallbackLocale,
    );
    return collections.length === 0 ? [] : [{ locale, collections }];
  });
}

export function localizedArchivePath(
  manifest: ContentManifest,
  path: string,
  locale: string,
): string {
  return localizedPagePath(manifest.localization, path, locale);
}
