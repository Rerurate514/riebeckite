import {
  type ConfigValidationIssue,
  createStyleAsset,
  defineEndpoint,
  definePlugin,
  type OutputDependency,
  type PlannedGeneratedOutput,
  type PluginEndpoint,
  type ResolvedRiebeckiteConfig,
  resolvePlugins,
} from "@riebeckite/core";
import {
  buildTaxonomyIndex,
  serializeTaxonomyIndex,
} from "./src/collections.js";
import { renderTermFeed } from "./src/feeds.js";
import { resolveTaxonomyOptions } from "./src/options.js";
import { renderTaxonomyIndexPage, renderTaxonomyPage } from "./src/pages.js";
import type {
  ResolvedTaxonomyOptions,
  TaxonomyFeedFormat,
  TaxonomyKind,
  TaxonomyOptions,
} from "./src/types.js";

export {
  buildTaxonomyIndex,
  serializeTaxonomyIndex,
  serializeTaxonomyTerm,
  toEntryReference,
} from "./src/collections.js";
export { buildFeedHeadTags, renderTermFeed } from "./src/feeds.js";
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
export {
  renderRelatedTerms,
  renderTaxonomyIndexPage,
  renderTaxonomyPage,
} from "./src/pages.js";
export { buildTaxonomySeo } from "./src/seo.js";
export { buildTaxonomyTagHref, slugifyTaxonomyValue } from "./src/slug.js";
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
  return definePlugin({
    name: TAXONOMY_PLUGIN_NAME,
    options,
    validateOptions: validateTaxonomyOptions,
    endpoints: createTaxonomyEndpoints(resolved),
    pageTypes: [
      {
        id: "taxonomy-term",
        paths: ({ manifest }) =>
          taxonomyPagePaths(manifest.discoverableEntries, resolved),
        outputDependencies: ({ manifest, pathname }) => {
          const term = findTaxonomyTerm(
            manifest.discoverableEntries,
            resolved,
            pathname,
            manifest.icons,
          );
          return term
            ? taxonomyPageOutputDependencies(term, resolved.related)
            : [{ type: "unknown" }];
        },
        resolve: ({ manifest, pathname }) => {
          const term = findTaxonomyTerm(
            manifest.discoverableEntries,
            resolved,
            pathname,
            manifest.icons,
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
      {
        id: "taxonomy-index",
        paths: () => taxonomyIndexPagePaths(resolved),
        outputDependencies: ({ pathname }) => {
          const kind = resolveTaxonomyIndexPath(pathname, resolved);
          const dependency: OutputDependency | undefined =
            kind === "tag"
              ? { type: "projection" as const, projection: "taxonomy-tags" }
              : kind === "folder"
                ? {
                    type: "projection" as const,
                    projection: "taxonomy-folders",
                  }
                : undefined;
          return dependency
            ? [...pageProjectionDependencies, dependency]
            : [{ type: "unknown" }];
        },
        resolve: ({ manifest, pathname }) => {
          const kind = resolveTaxonomyIndexPath(pathname, resolved);
          if (!kind) return null;
          const index = buildTaxonomyIndex(
            manifest.discoverableEntries,
            resolved,
            manifest.icons,
          );
          const page = renderTaxonomyIndexPage(
            kind,
            kind === "tag" ? index.tags : index.folders,
            resolved,
          );
          return {
            type: "taxonomy-index",
            pathname,
            title: page.title,
            body: page.html,
          };
        },
      },
    ],
    planGeneratedOutputs(context) {
      if (!context.site) return [];
      const index = buildTaxonomyIndex(
        context.manifest.discoverableEntries,
        resolved,
      );
      const outputs: PlannedGeneratedOutput[] = [];
      for (const term of [...index.tags, ...index.folders]) {
        for (const format of enabledFormats(resolved)) {
          const path = feedFilePath(term.path, format);
          outputs.push({
            path,
            content: renderTermFeed(
              { site: context.site },
              term,
              format,
              resolved.feedLimit,
            ),
            dependencies: taxonomyOutputDependencies(term),
          });
        }
      }
      return outputs;
    },
    assets: [
      createStyleAsset(
        TAXONOMY_PLUGIN_NAME,
        "@riebeckite/plugin-taxonomy/style.css",
      ),
    ],
  });
}

function taxonomyPagePaths(
  entries: Parameters<typeof buildTaxonomyIndex>[0],
  options: ResolvedTaxonomyOptions,
): readonly string[] {
  const index = buildTaxonomyIndex(entries, options);
  return [...index.tags, ...index.folders].map((term) => term.path);
}

function taxonomyOutputDependencies(term: {
  readonly kind: TaxonomyKind;
  readonly value: string;
}) {
  return [
    term.kind === "tag"
      ? { type: "tag" as const, tag: term.value }
      : { type: "folder" as const, folder: term.value },
  ];
}

function taxonomyPageOutputDependencies(
  term: { readonly kind: TaxonomyKind; readonly value: string },
  related: boolean,
): readonly OutputDependency[] {
  const relatedDependencies: readonly OutputDependency[] =
    related && term.kind === "tag"
      ? [{ type: "projection", projection: "taxonomy-tags" }]
      : [];
  return [
    ...pageProjectionDependencies,
    ...taxonomyOutputDependencies(term),
    ...relatedDependencies,
  ];
}

const pageProjectionDependencies: readonly OutputDependency[] = [
  { type: "projection" as const, projection: "navigation" },
  { type: "projection" as const, projection: "recent-posts" },
];

function findTaxonomyTerm(
  entries: Parameters<typeof buildTaxonomyIndex>[0],
  options: ResolvedTaxonomyOptions,
  pathname: string,
  icons?: Parameters<typeof buildTaxonomyIndex>[2],
) {
  const index = buildTaxonomyIndex(entries, options, icons);
  return [...index.tags, ...index.folders].find(
    (term) => term.path === pathname,
  );
}

function taxonomyIndexPagePaths(
  options: ResolvedTaxonomyOptions,
): readonly string[] {
  const paths: string[] = [];
  if (options.tags && options.tagsBasePath !== "") {
    paths.push(options.tagsBasePath);
  }
  if (options.folders && options.foldersBasePath !== "") {
    paths.push(options.foldersBasePath);
  }
  return [...new Set(paths)];
}

function resolveTaxonomyIndexPath(
  pathname: string,
  options: ResolvedTaxonomyOptions,
): TaxonomyKind | null {
  if (
    options.tags &&
    options.tagsBasePath !== "" &&
    pathname === options.tagsBasePath
  ) {
    return "tag";
  }
  if (
    options.folders &&
    options.foldersBasePath !== "" &&
    pathname === options.foldersBasePath
  ) {
    return "folder";
  }
  return null;
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
          buildTaxonomyIndex(
            manifest.discoverableEntries,
            resolved,
            manifest.icons,
          ),
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

  for (const key of ["tags", "folders", "related"] as const) {
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
