import {
  type ConfigValidationIssue,
  type ContentManifest,
  createStyleAsset,
  definePlugin,
  localizedPagePath,
  selectLocalizedEntries,
} from "@riebeckite/core";
import {
  collectSeriesDiagnostics,
  collectSeriesIndexes,
  renderSeriesIndex,
  renderSeriesList,
  resolveSeriesOptions,
  seriesLandingPath,
} from "./src/series.js";
import type {
  ResolvedSeriesOptions,
  SeriesIndex,
  SeriesOptions,
} from "./src/types.js";

export type { SeriesNavigationProps } from "./components/series-navigation.js";
export { default as SeriesNavigation } from "./components/series-navigation.js";
export {
  buildSeriesIndex,
  collectSeriesIndexes,
  DEFAULT_SERIES_BASE_PATH,
  getSeriesNavigation,
  renderSeriesIndex,
  renderSeriesList,
  renderSeriesNavigation,
  seriesLandingPath,
  seriesSlug,
} from "./src/series.js";
export type {
  ResolvedSeriesOptions,
  SeriesIndex,
  SeriesMember,
  SeriesOptions,
} from "./src/types.js";

type SeriesPageModel = {
  resolved: ResolvedSeriesOptions;
  views: Map<string, ContentManifest>;
  listPaths: Map<string, string>;
  listOptions: (viewKey: string) => SeriesOptions;
  byPath: Map<
    string,
    { index: SeriesIndex; locale: string; view: ContentManifest }
  >;
};

/**
 * Series (ordered multi-part posts) for Riebeckite.
 *
 * Notes that share a `series` frontmatter value are gathered at build time and
 * receive the same generated navigation (`<nav class="rb-series">`) listing
 * every part in order, with the current part marked and previous/next links.
 * Order is read from `series_order` (configurable); notes without a valid order
 * fall back to `date`, then `title`, then `slug` for deterministic results.
 */
export function series(options: SeriesOptions = {}) {
  const models = new WeakMap<ContentManifest, SeriesPageModel>();
  const modelFor = (manifest: ContentManifest): SeriesPageModel => {
    const cached = models.get(manifest);
    if (cached) return cached;

    const resolved = resolveSeriesOptions(options);
    const localization = manifest.localization;
    const locales = localization
      ? resolved.localeMode === "all"
        ? [localization.defaultLocale]
        : localization.locales
      : [undefined];
    const views = new Map<string, ContentManifest>();
    const listPaths = new Map<string, string>();
    const byPath = new Map<
      string,
      { index: SeriesIndex; locale: string; view: ContentManifest }
    >();
    if (resolved.basePath !== "") {
      for (const locale of locales) {
        const entries = localization
          ? selectLocalizedEntries(manifest.discoverableEntries, {
              mode: resolved.localeMode,
              locale,
              ...(localization.fallbackLocale
                ? { fallbackLocale: localization.fallbackLocale }
                : {}),
            })
          : manifest.discoverableEntries;
        const view: ContentManifest = { ...manifest, entries: [...entries] };
        const viewKey = locale ?? "";
        views.set(viewKey, view);
        const path = localizedPagePath(
          localization,
          resolved.basePath,
          locale ?? localization?.defaultLocale ?? "",
        );
        let hasLanding = false;
        for (const index of collectSeriesIndexes(view, options)) {
          const landing = localizedPagePath(
            localization,
            seriesLandingPath(index.name, options),
            locale ?? localization?.defaultLocale ?? "",
          );
          if (landing === "" || byPath.has(landing)) continue;
          byPath.set(landing, { index, locale: locale ?? "", view });
          hasLanding = true;
        }
        if (hasLanding && !listPaths.has(path)) {
          listPaths.set(path, viewKey);
        }
      }
    }

    const model: SeriesPageModel = {
      resolved,
      views,
      listPaths,
      listOptions: (viewKey) =>
        localization && viewKey
          ? {
              ...options,
              basePath: localizedPagePath(
                localization,
                resolved.basePath,
                viewKey,
              ),
            }
          : options,
      byPath,
    };
    models.set(manifest, model);
    return model;
  };

  return definePlugin({
    name: "series",
    processedContentCache: {
      version: "series-v1",
      dependencyMode: "none",
    },
    contentOutputDependencies: [{ type: "global" }],
    options,
    validateOptions: validateSeriesOptions,
    onManifestCreated: ({ manifest, diagnostics }) => {
      diagnostics.push(...collectSeriesDiagnostics(manifest, options));
    },
    pageTypes: [
      {
        id: "series-list",
        paths: ({ manifest }) => [...modelFor(manifest).listPaths.keys()],
        outputDependencies: [{ type: "global" }],
        resolve: ({ manifest, pathname }) => {
          const model = modelFor(manifest);
          const viewKey = model.listPaths.get(pathname);
          if (viewKey === undefined) return null;
          const view = model.views.get(viewKey);
          if (!view) return null;
          const body = renderSeriesList(view, model.listOptions(viewKey));
          if (body === "") return null;
          return {
            type: "series-list",
            layout: model.resolved.layout,
            pathname,
            title: "Series",
            body,
            ...(viewKey ? { language: viewKey } : {}),
          };
        },
        resolveRoute: ({ manifest, pathname }) => {
          const model = modelFor(manifest);
          const viewKey = model.listPaths.get(pathname);
          if (viewKey === undefined) return null;
          const view = model.views.get(viewKey);
          if (!view) return null;
          const body = renderSeriesList(view, model.listOptions(viewKey));
          if (body === "") return null;
          return {
            type: "series-list",
            layout: model.resolved.layout,
            pathname,
            title: "Series",
            body,
            ...(viewKey ? { language: viewKey } : {}),
          };
        },
      },
      {
        id: "series-index",
        paths: ({ manifest }) => [...modelFor(manifest).byPath.keys()],
        outputDependencies: [{ type: "global" }],
        resolve: ({ manifest, pathname }) => {
          const model = modelFor(manifest);
          const entry = model.byPath.get(pathname);
          if (!entry) return null;
          const body = renderSeriesIndex(entry.view, entry.index.name, options);
          if (body === "") return null;
          return {
            type: "series-index",
            layout: model.resolved.layout,
            pathname,
            title: entry.index.title,
            body,
            ...(entry.locale ? { language: entry.locale } : {}),
          };
        },
        resolveRoute: ({ manifest, pathname }) => {
          const model = modelFor(manifest);
          const entry = model.byPath.get(pathname);
          if (!entry) return null;
          const body = renderSeriesIndex(entry.view, entry.index.name, options);
          if (body === "") return null;
          return {
            type: "series-index",
            layout: model.resolved.layout,
            pathname,
            title: entry.index.title,
            body,
            ...(entry.locale ? { language: entry.locale } : {}),
          };
        },
      },
    ],
    assets: [createStyleAsset("series", "@riebeckite/plugin-series/style.css")],
  });
}

function validateSeriesOptions(
  options: SeriesOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  if (
    options.layout !== undefined &&
    options.layout !== "article" &&
    options.layout !== "wide"
  ) {
    issues.push({ path: "layout", message: 'Expected "article" or "wide".' });
  }
  for (const key of [
    "key",
    "orderKey",
    "titleKey",
    "className",
    "basePath",
  ] as const) {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  }
  for (const key of ["heading", "positionLabel"] as const) {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  }
  if (
    options.localeMode !== undefined &&
    options.localeMode !== "current" &&
    options.localeMode !== "fallback" &&
    options.localeMode !== "all"
  ) {
    issues.push({
      path: "localeMode",
      message: 'Expected "current", "fallback", or "all".',
    });
  }
  return issues;
}

/** Convenience re-export so tooling can resolve options without the factory. */
export { resolveSeriesOptions };

/** The default class name used by the plugin stylesheet. */
export const DEFAULT_CLASS_NAME = resolveSeriesOptions({}).className;
