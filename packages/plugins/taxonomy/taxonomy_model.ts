import {
  type ContentManifest,
  type ContentManifestEntry,
  localizedPagePath,
  type ResolvedRiebeckiteConfig,
  selectLocalizedEntries,
} from "@riebeckite/core";
import { buildTaxonomyIndex } from "./src/collections.js";
import type {
  ResolvedTaxonomyOptions,
  TaxonomyIndex,
  TaxonomyKind,
  TaxonomyTerm,
} from "./src/types.js";
import { isExcludedEntry } from "./taxonomy_options.js";

export type TaxonomyModel = {
  readonly locale: string;
  readonly index: TaxonomyIndex;
  readonly tagIndexPath: string | null;
  readonly folderIndexPath: string | null;
};

export type TaxonomySource = {
  readonly discoverableEntries: readonly ContentManifestEntry[];
  readonly localization?: ContentManifest["localization"];
  readonly icons?: ContentManifest["icons"];
};

export function taxonomyModels(
  source: TaxonomySource,
  options: ResolvedTaxonomyOptions,
  config?: Pick<ResolvedRiebeckiteConfig, "site"> | undefined,
): readonly TaxonomyModel[] {
  const localization = source.localization;
  const locales = localization
    ? options.localeMode === "all"
      ? [localization.defaultLocale]
      : localization.locales
    : [config?.site.locale ?? "en"];
  return locales.map((locale) => {
    const entries = (
      localization
        ? selectLocalizedEntries(source.discoverableEntries, {
            mode: options.localeMode,
            locale,
            ...(localization.fallbackLocale
              ? { fallbackLocale: localization.fallbackLocale }
              : {}),
          })
        : source.discoverableEntries
    ).filter((entry) => !isExcludedEntry(entry, options.exclude));
    return {
      locale,
      index: buildTaxonomyIndex(
        entries,
        options,
        source.icons,
        localization ? { locale, localization } : undefined,
      ),
      tagIndexPath:
        options.tags && options.tagsBasePath !== ""
          ? localizedPagePath(localization, options.tagsBasePath, locale)
          : null,
      folderIndexPath:
        options.folders && options.foldersBasePath !== ""
          ? localizedPagePath(localization, options.foldersBasePath, locale)
          : null,
    };
  });
}

export function findTaxonomyModel(
  models: readonly TaxonomyModel[],
  pathname: string,
): { model: TaxonomyModel; term: TaxonomyTerm } | null {
  for (const model of models) {
    for (const term of [...model.index.tags, ...model.index.folders]) {
      if (term.path === pathname) return { model, term };
    }
  }
  return null;
}

export function resolveTaxonomyIndexPath(
  pathname: string,
  models: readonly TaxonomyModel[],
): TaxonomyKind | null {
  for (const model of models) {
    if (model.tagIndexPath === pathname) return "tag";
    if (model.folderIndexPath === pathname) return "folder";
  }
  return null;
}
