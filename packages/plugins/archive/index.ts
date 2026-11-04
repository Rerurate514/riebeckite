import {
  type ConfigValidationIssue,
  type ContentManifest,
  createStyleAsset,
  definePlugin,
  localizedPagePath,
  type ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { buildArchivePages } from "./src/collections.js";
import {
  buildArchiveDescription,
  normalizeArchiveLocale,
} from "./src/locale.js";
import { resolveArchiveOptions } from "./src/options.js";
import { renderArchivePage } from "./src/pages.js";
import type { ArchiveOptions, ResolvedArchiveOptions } from "./src/types.js";

export {
  ARCHIVE_COLLECTION_KIND,
  archiveDefinitions,
  buildArchiveCollections,
  buildArchivePages,
} from "./src/collections.js";
export {
  archivePaginationLabels,
  buildArchiveDescription,
  formatArchivePeriod,
} from "./src/locale.js";
export {
  DEFAULT_ARCHIVE_BASE_PATH,
  DEFAULT_ARCHIVE_CLASS_NAME,
  DEFAULT_ARCHIVE_PAGE_SIZE,
  resolveArchiveOptions,
} from "./src/options.js";
export { renderArchivePage } from "./src/pages.js";
export type {
  ArchiveOptions,
  ArchivePage,
  ResolvedArchiveOptions,
} from "./src/types.js";

export const ARCHIVE_PLUGIN_NAME = "archive";

export function archive(options: ArchiveOptions = {}) {
  const resolved = resolveArchiveOptions(options);

  return definePlugin({
    name: ARCHIVE_PLUGIN_NAME,
    options,
    assets: [
      createStyleAsset("archive", "@riebeckite/plugin-archive/style.css"),
    ],
    validateOptions: validateArchiveOptions,
    pageTypes: [
      {
        id: "archive",
        paths: ({ manifest, config }) => [
          ...archivePageModels(manifest, config, resolved).keys(),
        ],
        outputDependencies: [{ type: "global" }],
        resolve: ({ manifest, pathname, config }) => {
          if (resolved.basePath === "") return null;
          const model = archivePageModels(manifest, config, resolved).get(
            pathname,
          );
          if (!model) return null;
          const page = renderArchivePage(
            model.collection,
            resolved,
            model.locale,
          );
          return {
            type: "archive",
            pathname,
            title: page.title,
            description: config
              ? buildArchiveDescription(
                  config.site.title,
                  page.title,
                  model.locale,
                )
              : undefined,
            language: normalizeArchiveLocale(model.locale),
            body: page.html,
          };
        },
        resolveRoute: ({ manifest, pathname, config }) => {
          if (resolved.basePath === "") return null;
          const model = archivePageModels(manifest, config, resolved).get(
            pathname,
          );
          if (!model) return null;
          const page = renderArchivePage(
            model.collection,
            resolved,
            model.locale,
          );
          return {
            type: "archive",
            pathname,
            title: page.title,
            description: config
              ? buildArchiveDescription(
                  config.site.title,
                  page.title,
                  model.locale,
                )
              : undefined,
            language: normalizeArchiveLocale(model.locale),
            body: page.html,
          };
        },
      },
    ],
  });
}

function resolveLocale(
  config: ResolvedRiebeckiteConfig | undefined,
  options: ResolvedArchiveOptions,
): string {
  return options.locale ?? config?.site.locale ?? "en";
}

function archivePageModels(
  manifest: ContentManifest,
  config: ResolvedRiebeckiteConfig | undefined,
  options: ResolvedArchiveOptions,
): Map<
  string,
  {
    collection: ReturnType<
      typeof buildArchivePages
    >[number]["collections"][number];
    locale: string;
  }
> {
  const models = new Map<
    string,
    {
      collection: ReturnType<
        typeof buildArchivePages
      >[number]["collections"][number];
      locale: string;
    }
  >();
  for (const { locale, collections } of buildArchivePages(
    manifest,
    options,
    resolveLocale(config, options),
  )) {
    for (const collection of collections) {
      models.set(
        localizedPagePath(manifest.localization, collection.path, locale),
        { collection, locale },
      );
    }
  }
  return models;
}

function validateArchiveOptions(
  options: ArchiveOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];
  const issues: ConfigValidationIssue[] = [];
  if (options.basePath !== undefined && typeof options.basePath !== "string") {
    issues.push({ path: "basePath", message: "Expected a string." });
  }
  for (const key of ["locale", "className"] as const) {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  }
  if (
    options.pageSize !== undefined &&
    (typeof options.pageSize !== "number" ||
      !Number.isInteger(options.pageSize) ||
      options.pageSize < 0)
  ) {
    issues.push({
      path: "pageSize",
      message: "Expected a non-negative integer.",
    });
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
