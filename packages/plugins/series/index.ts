import {
  type ConfigValidationIssue,
  type ContentManifest,
  createStyleAsset,
  definePlugin,
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
  view: ContentManifest;
  listPath: string;
  landingPaths: readonly string[];
  byPath: Map<string, SeriesIndex>;
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
    const view: ContentManifest = {
      ...manifest,
      entries: manifest.discoverableEntries,
    };
    const byPath = new Map<string, SeriesIndex>();
    const landingPaths: string[] = [];
    if (resolved.basePath !== "") {
      for (const index of collectSeriesIndexes(view, options)) {
        const path = seriesLandingPath(index.name, options);
        if (path === "" || byPath.has(path)) continue;
        byPath.set(path, index);
        landingPaths.push(path);
      }
    }

    const model: SeriesPageModel = {
      resolved,
      view,
      listPath:
        resolved.basePath !== "" && landingPaths.length > 0
          ? resolved.basePath
          : "",
      landingPaths,
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
        paths: ({ manifest }) => {
          const listPath = modelFor(manifest).listPath;
          return listPath === "" ? [] : [listPath];
        },
        outputDependencies: [{ type: "global" }],
        resolve: ({ manifest, pathname }) => {
          const model = modelFor(manifest);
          if (model.listPath === "" || pathname !== model.listPath) return null;
          const body = renderSeriesList(model.view, options);
          if (body === "") return null;
          return {
            type: "series-list",
            pathname,
            title: "Series",
            body,
          };
        },
      },
      {
        id: "series-index",
        paths: ({ manifest }) => modelFor(manifest).landingPaths,
        outputDependencies: [{ type: "global" }],
        resolve: ({ manifest, pathname }) => {
          const model = modelFor(manifest);
          const index = model.byPath.get(pathname);
          if (!index) return null;
          const body = renderSeriesIndex(model.view, index.name, options);
          if (body === "") return null;
          return {
            type: "series-index",
            pathname,
            title: index.title,
            body,
          };
        },
      },
    ],
    assets: [createStyleAsset("series", "@riebeckite/plugin-series/style.css")],
  });
}

export const seriesPlugin = series;

function validateSeriesOptions(
  options: SeriesOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
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
  return issues;
}

/** Convenience re-export so tooling can resolve options without the factory. */
export { resolveSeriesOptions };

/** The default class name used by the plugin stylesheet. */
export const DEFAULT_CLASS_NAME = resolveSeriesOptions({}).className;
