import {
  type ConfigValidationIssue,
  createStyleAsset,
  defineEndpoint,
  definePlugin,
  type PluginEndpoint,
  type ResolvedRiebeckiteConfig,
  resolvePlugins,
} from "@riebeckite/core";
import {
  buildTaxonomyIndex,
  serializeTaxonomyIndex,
} from "./src/collections.js";
import { renderTermFeed } from "./src/feeds.js";
import { resolveFolderIndexLocations } from "./src/locations.js";
import { resolveTaxonomyOptions } from "./src/options.js";
import { renderTaxonomyPage } from "./src/pages.js";
import type {
  ResolvedTaxonomyOptions,
  TaxonomyFeedFormat,
  TaxonomyOptions,
} from "./src/types.js";

export {
  buildTaxonomyIndex,
  serializeTaxonomyIndex,
  serializeTaxonomyTerm,
  toEntryReference,
} from "./src/collections.js";
export { buildFeedHeadTags, renderTermFeed } from "./src/feeds.js";
export { resolveFolderIndexLocations } from "./src/locations.js";
export {
  DEFAULT_TAXONOMY_CLASS_NAME,
  DEFAULT_TAXONOMY_DATA_ENDPOINT,
  DEFAULT_TAXONOMY_FEED_LIMIT,
  DEFAULT_TAXONOMY_FOLDERS_BASE_PATH,
  DEFAULT_TAXONOMY_MIN_ENTRIES,
  DEFAULT_TAXONOMY_RELATED_LIMIT,
  DEFAULT_TAXONOMY_TAGS_BASE_PATH,
  resolveTaxonomyOptions,
} from "./src/options.js";
export { renderRelatedTerms, renderTaxonomyPage } from "./src/pages.js";
export { buildTaxonomySeo } from "./src/seo.js";
export { slugifyTaxonomyValue } from "./src/slug.js";
export type {
  ResolvedTaxonomyOptions,
  TaxonomyEntryReference,
  TaxonomyFeedFormat,
  TaxonomyFeedLinks,
  TaxonomyFeedOptions,
  TaxonomyHeadTag,
  TaxonomyIndex,
  TaxonomyIndexData,
  TaxonomyKind,
  TaxonomyOptions,
  TaxonomyPage,
  TaxonomyRelatedTerm,
  TaxonomyTerm,
  TaxonomyTermContext,
  TaxonomyTermData,
} from "./src/types.js";
export { buildTaxonomyAbsoluteUrl } from "./src/url.js";

export const TAXONOMY_PLUGIN_NAME = "taxonomy";

/**
 * Build-time taxonomy data, per-term feeds, SEO metadata, and folder-index
 * locations for Riebeckite.
 *
 * The plugin owns data, feeds, SEO, and tag/folder page types. A generic site
 * catch-all resolves those page types, so this plugin never needs application
 * routes. Per-term feeds are emitted as static files through the build's
 * generated-output sink, so no client JavaScript is required.
 */
export function taxonomy(options: TaxonomyOptions = {}) {
  const resolved = resolveTaxonomyOptions(options);
  // A PluginRuntime accumulates generated outputs and rejects a path emitted
  // twice. `buildEnd` can run more than once (for example when concurrent
  // requests race the first manifest build), so emission is guarded to stay
  // idempotent within one plugin instance.
  const emittedFeeds = new Set<string>();

  return definePlugin({
    name: TAXONOMY_PLUGIN_NAME,
    options,
    validateOptions: validateTaxonomyOptions,
    resolveContentLocations: ({ entries, diagnostics }) =>
      resolveFolderIndexLocations(entries, resolved, diagnostics),
    endpoints: createTaxonomyEndpoints(resolved),
    pageTypes: [
      {
        id: "taxonomy-term",
        paths: ({ manifest }) =>
          taxonomyPagePaths(manifest.discoverableEntries, resolved),
        outputDependencies: [{ type: "global" }],
        resolve: ({ manifest, pathname }) => {
          const term = findTaxonomyTerm(
            manifest.discoverableEntries,
            resolved,
            pathname,
          );
          if (!term) return null;
          const page = renderTaxonomyPage(term, resolved);
          return {
            type: "taxonomy-term",
            pathname: term.path,
            title: page.title,
            body: page.html,
            headTags: page.headTags,
          };
        },
      },
    ],
    buildEnd(context) {
      const { config, manifest } = context;
      if (!config) return;
      const index = buildTaxonomyIndex(manifest.discoverableEntries, resolved);
      for (const term of [...index.tags, ...index.folders]) {
        for (const format of enabledFormats(resolved)) {
          const path = feedFilePath(term.path, format);
          if (emittedFeeds.has(path)) continue;
          emittedFeeds.add(path);
          context.output.emit({
            path,
            content: renderTermFeed(config, term, format, resolved.feedLimit),
            dependencies: [{ type: "global" }],
          });
        }
      }
    },
    assets: [createStyleAsset(TAXONOMY_PLUGIN_NAME)],
  });
}

/** Alias matching the `*Plugin` suffix used by other plugin factories. */
export const taxonomyPlugin = taxonomy;

function taxonomyPagePaths(
  entries: Parameters<typeof buildTaxonomyIndex>[0],
  options: ResolvedTaxonomyOptions,
): readonly string[] {
  const index = buildTaxonomyIndex(entries, options);
  return [...index.tags, ...index.folders].map((term) => term.path);
}

function findTaxonomyTerm(
  entries: Parameters<typeof buildTaxonomyIndex>[0],
  options: ResolvedTaxonomyOptions,
  pathname: string,
) {
  const index = buildTaxonomyIndex(entries, options);
  return [...index.tags, ...index.folders].find(
    (term) => term.path === pathname,
  );
}

/**
 * Reads the taxonomy plugin's resolved options back from a Riebeckite config.
 *
 * App routes use this so the listing pages, feeds, and SEO they build from the
 * exported helpers share the exact options the plugin was registered with,
 * without duplicating the options object.
 */
export function resolveTaxonomyOptionsFromConfig(
  config: ResolvedRiebeckiteConfig,
): ResolvedTaxonomyOptions {
  const plugin = resolvePlugins(config.plugins).find(
    (candidate) => candidate.name === TAXONOMY_PLUGIN_NAME,
  );
  return resolveTaxonomyOptions(
    (plugin?.options as TaxonomyOptions | undefined) ?? {},
  );
}

function createTaxonomyEndpoints(
  resolved: ResolvedTaxonomyOptions,
): PluginEndpoint[] {
  if (!resolved.tags && !resolved.folders) return [];
  return [
    defineEndpoint(
      resolved.dataEndpoint,
      ({ manifest }) => ({
        json: serializeTaxonomyIndex(
          buildTaxonomyIndex(manifest.discoverableEntries, resolved),
        ),
      }),
      { cacheControl: "public, max-age=300" },
    ),
  ];
}

function enabledFormats(
  resolved: ResolvedTaxonomyOptions,
): TaxonomyFeedFormat[] {
  const formats: TaxonomyFeedFormat[] = [];
  if (resolved.feeds.rss) formats.push("rss");
  if (resolved.feeds.atom) formats.push("atom");
  if (resolved.feeds.json) formats.push("json");
  return formats;
}

function feedFilePath(path: string, format: TaxonomyFeedFormat): string {
  const base = path.replace(/^\/+/, "");
  if (format === "rss") return `${base}/feed.xml`;
  if (format === "atom") return `${base}/atom.xml`;
  return `${base}/feed.json`;
}

function validateTaxonomyOptions(
  options: TaxonomyOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  const assertBoolean = (key: keyof TaxonomyOptions): void => {
    const value = options[key];
    if (value !== undefined && typeof value !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  };
  const assertNonEmptyString = (key: keyof TaxonomyOptions): void => {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  };
  const assertNonNegativeInteger = (key: keyof TaxonomyOptions): void => {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "number" || !Number.isInteger(value) || value < 0)
    ) {
      issues.push({
        path: key,
        message: "Expected a non-negative integer.",
      });
    }
  };

  for (const key of ["tags", "folders", "related", "folderIndexes"] as const) {
    assertBoolean(key);
  }
  for (const key of [
    "tagsBasePath",
    "foldersBasePath",
    "className",
    "dataEndpoint",
  ] as const) {
    assertNonEmptyString(key);
  }
  for (const key of [
    "folderDepth",
    "minEntries",
    "relatedLimit",
    "feedLimit",
  ] as const) {
    assertNonNegativeInteger(key);
  }
  if (options.feeds !== undefined) {
    if (typeof options.feeds !== "object" || options.feeds === null) {
      issues.push({ path: "feeds", message: "Expected an object." });
    } else {
      for (const key of ["rss", "atom", "json"] as const) {
        const value = options.feeds[key];
        if (value !== undefined && typeof value !== "boolean") {
          issues.push({
            path: `feeds.${key}`,
            message: "Expected a boolean.",
          });
        }
      }
    }
  }
  if (
    options.resolveTitle !== undefined &&
    typeof options.resolveTitle !== "function"
  ) {
    issues.push({ path: "resolveTitle", message: "Expected a function." });
  }

  return issues;
}

export type { SeoMetadata } from "@riebeckite/core";
