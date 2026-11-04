import {
  type ConfigValidationIssue,
  type ContentManifest,
  type ContentManifestEntry,
  createStyleAsset,
  defineEndpoint,
  definePlugin,
  localizedPagePath,
  type OutputDependency,
  type PlannedGeneratedOutput,
  type PluginEndpoint,
  type ResolvedRiebeckiteConfig,
  resolvePlugins,
  selectLocalizedEntries,
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
  TaxonomyIndex,
  TaxonomyKind,
  TaxonomyOptions,
  TaxonomyTerm,
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
        paths: ({ manifest, config }) =>
          taxonomyModels(manifest, resolved, config).flatMap((model) =>
            [...model.index.tags, ...model.index.folders].map(
              (term) => term.path,
            ),
          ),
        outputDependencies: ({ manifest, pathname, config }) => {
          const model = findTaxonomyModel(
            taxonomyModels(manifest, resolved, config),
            pathname,
          );
          return model?.term
            ? taxonomyPageOutputDependencies(model.term, resolved.related)
            : [{ type: "unknown" }];
        },
        resolve: ({ manifest, pathname, config }) => {
          const model = findTaxonomyModel(
            taxonomyModels(manifest, resolved, config),
            pathname,
          );
          if (!model?.term) return null;
          const page = renderTaxonomyPage(model.term, resolved);
          return {
            type: "taxonomy-term",
            pathname: model.term.path,
            title: page.title,
            body: page.html,
            headTags: page.headTags,
            language: model.model.locale,
          };
        },
        resolveRoute: ({ manifest, pathname, config }) => {
          const model = findTaxonomyModel(
            taxonomyModels(manifest, resolved, config),
            pathname,
          );
          if (!model?.term) return null;
          const page = renderTaxonomyPage(model.term, resolved);
          return {
            type: "taxonomy-term",
            pathname: model.term.path,
            title: page.title,
            body: page.html,
            headTags: page.headTags,
            language: model.model.locale,
          };
        },
      },
      {
        id: "taxonomy-index",
        paths: ({ manifest, config }) =>
          taxonomyModels(manifest, resolved, config).flatMap((model) => [
            ...(model.tagIndexPath ? [model.tagIndexPath] : []),
            ...(model.folderIndexPath ? [model.folderIndexPath] : []),
          ]),
        outputDependencies: ({ pathname, manifest, config }) => {
          const kind = resolveTaxonomyIndexPath(
            pathname,
            taxonomyModels(manifest, resolved, config),
          );
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
        resolve: ({ manifest, pathname, config }) => {
          const models = taxonomyModels(manifest, resolved, config);
          const kind = resolveTaxonomyIndexPath(pathname, models);
          if (!kind) return null;
          const model = models.find((candidate) =>
            kind === "tag"
              ? candidate.tagIndexPath === pathname
              : candidate.folderIndexPath === pathname,
          );
          if (!model) return null;
          const page = renderTaxonomyIndexPage(
            kind,
            kind === "tag" ? model.index.tags : model.index.folders,
            resolved,
          );
          return {
            type: "taxonomy-index",
            pathname,
            title: page.title,
            body: page.html,
            language: model.locale,
          };
        },
        resolveRoute: ({ manifest, pathname, config }) => {
          const models = taxonomyModels(manifest, resolved, config);
          const kind = resolveTaxonomyIndexPath(pathname, models);
          if (!kind) return null;
          const model = models.find((candidate) =>
            kind === "tag"
              ? candidate.tagIndexPath === pathname
              : candidate.folderIndexPath === pathname,
          );
          if (!model) return null;
          const page = renderTaxonomyIndexPage(
            kind,
            kind === "tag" ? model.index.tags : model.index.folders,
            resolved,
          );
          return {
            type: "taxonomy-index",
            pathname,
            title: page.title,
            body: page.html,
            language: model.locale,
          };
        },
      },
    ],
    planGeneratedOutputs(context) {
      if (!context.site) return [];
      const models = taxonomyModels(context.manifest, resolved, {
        site: context.site,
      });
      const outputs: PlannedGeneratedOutput[] = [];
      for (const model of models) {
        for (const term of [...model.index.tags, ...model.index.folders]) {
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

type TaxonomyModel = {
  readonly locale: string;
  readonly index: TaxonomyIndex;
  readonly tagIndexPath: string | null;
  readonly folderIndexPath: string | null;
};

type TaxonomySource = {
  readonly discoverableEntries: readonly ContentManifestEntry[];
  readonly localization?: ContentManifest["localization"];
  readonly icons?: ContentManifest["icons"];
};

function taxonomyModels(
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
    const entries = localization
      ? selectLocalizedEntries(source.discoverableEntries, {
          mode: options.localeMode,
          locale,
          ...(localization.fallbackLocale
            ? { fallbackLocale: localization.fallbackLocale }
            : {}),
        })
      : source.discoverableEntries;
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

function findTaxonomyModel(
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

function resolveTaxonomyIndexPath(
  pathname: string,
  models: readonly TaxonomyModel[],
): TaxonomyKind | null {
  for (const model of models) {
    if (model.tagIndexPath === pathname) return "tag";
    if (model.folderIndexPath === pathname) return "folder";
  }
  return null;
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
      ({ manifest, config, request }) => {
        const models = taxonomyModels(manifest, resolved, config);
        const model = selectTaxonomyModel(models, request);
        return model
          ? {
              json: serializeTaxonomyIndex(model.index),
              headers: { Vary: "Accept-Language" },
            }
          : {
              json: { tags: [], folders: [] },
              headers: { Vary: "Accept-Language" },
            };
      },
      { cacheControl: "public, max-age=300" },
    ),
  ];
}

export function selectTaxonomyModel(
  models: readonly { locale: string; index: TaxonomyIndex }[],
  request: {
    query: Readonly<Record<string, string>>;
    headers: Readonly<Record<string, string>>;
  },
): { locale: string; index: TaxonomyIndex } | undefined {
  const requested = request.query.locale;
  if (requested) {
    const exact = findLocaleModel(models, requested);
    if (exact) return exact;
  }
  for (const language of parseAcceptLanguage(
    request.headers["accept-language"],
  )) {
    const match = findLocaleModel(models, language);
    if (match) return match;
  }
  return models[0];
}

function findLocaleModel(
  models: readonly { locale: string; index: TaxonomyIndex }[],
  language: string,
): { locale: string; index: TaxonomyIndex } | undefined {
  const value = language.toLowerCase().replace(/_/g, "-");
  return (
    models.find((candidate) => candidate.locale.toLowerCase() === value) ??
    models.find((candidate) => {
      const locale = candidate.locale.toLowerCase();
      return locale.startsWith(`${value}-`) || value.startsWith(`${locale}-`);
    })
  );
}

function parseAcceptLanguage(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .flatMap((part) => {
      const [locale, ...parameters] = part.trim().split(";");
      if (!locale) return [];
      const quality = parameters
        .map((parameter) => parameter.trim())
        .find((parameter) => parameter.startsWith("q="));
      const weight = quality ? Number(quality.slice(2)) : 1;
      return [
        { locale: locale.trim(), weight: Number.isFinite(weight) ? weight : 0 },
      ];
    })
    .filter((entry) => entry.locale !== "" && entry.weight > 0)
    .sort((left, right) => right.weight - left.weight)
    .map((entry) => entry.locale);
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

export type { SeoMetadata } from "@riebeckite/core";
