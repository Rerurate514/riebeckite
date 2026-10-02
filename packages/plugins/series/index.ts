import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
  type PostContent,
} from "@riebeckite/core";
import {
  collectSeriesDiagnostics,
  collectSeriesIndexes,
  renderSeriesNavigation,
  resolveSeriesOptions,
} from "./src/series.js";
import type { SeriesOptions } from "./src/types.js";

export {
  buildSeriesIndex,
  collectSeriesIndexes,
  renderSeriesIndex,
  renderSeriesNavigation,
} from "./src/series.js";
export type {
  ResolvedSeriesOptions,
  SeriesIndex,
  SeriesMember,
  SeriesOptions,
} from "./src/types.js";

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
  const tracked = new Map<string, PostContent>();

  return definePlugin({
    name: "series",
    processedContentCache: {
      version: "series-v1",
      dependencyMode: "unsafe",
    },
    options,
    validateOptions: validateSeriesOptions,
    onPostProcessed: ({ slug, content }) => {
      tracked.set(slug, content);
    },
    onManifestCreated: ({ manifest, diagnostics }) => {
      diagnostics.push(...collectSeriesDiagnostics(manifest, options));

      const injected = new Set<string>();
      for (const index of collectSeriesIndexes(manifest, options)) {
        if (index.members.length < 2) continue;
        for (const member of index.members) {
          if (injected.has(member.slug)) continue;
          const entry = manifest.bySlug.get(member.slug);
          if (!entry) continue;
          injected.add(member.slug);
          const navigation = renderSeriesNavigation(
            index,
            member.slug,
            options,
          );
          entry.html = `${entry.html}\n${navigation}`;
          const content = tracked.get(member.slug);
          if (content) content.html = entry.html;
        }
      }
    },
    assets: [createStyleAsset("series")],
  });
}

export const seriesPlugin = series;

function validateSeriesOptions(
  options: SeriesOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  for (const key of ["key", "orderKey", "titleKey", "className"] as const) {
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
