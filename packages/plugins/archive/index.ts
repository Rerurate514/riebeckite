import {
  type ConfigValidationIssue,
  definePlugin,
  type ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { buildArchiveCollections } from "./src/collections.js";
import { resolveArchiveOptions } from "./src/options.js";
import { renderArchivePage } from "./src/pages.js";
import type { ArchiveOptions, ResolvedArchiveOptions } from "./src/types.js";

export {
  ARCHIVE_COLLECTION_KIND,
  archiveDefinitions,
  buildArchiveCollections,
} from "./src/collections.js";
export { archivePaginationLabels, formatArchivePeriod } from "./src/locale.js";
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
    validateOptions: validateArchiveOptions,
    pageTypes: [
      {
        id: "archive",
        paths: ({ manifest, config }) =>
          buildArchiveCollections(
            manifest.discoverableEntries,
            resolved,
            resolveLocale(config, resolved),
          ).map((collection) => collection.path),
        outputDependencies: [{ type: "global" }],
        resolve: ({ manifest, pathname, config }) => {
          if (resolved.basePath === "") return null;
          const locale = resolveLocale(config, resolved);
          const collection = buildArchiveCollections(
            manifest.discoverableEntries,
            resolved,
            locale,
          ).find((candidate) => candidate.path === pathname);
          if (!collection) return null;
          const page = renderArchivePage(collection, resolved, locale);
          return {
            type: "archive",
            pathname: collection.path,
            title: page.title,
            body: page.html,
          };
        },
      },
    ],
  });
}

export const archivePlugin = archive;

function resolveLocale(
  config: ResolvedRiebeckiteConfig | undefined,
  options: ResolvedArchiveOptions,
): string {
  return options.locale ?? config?.site.locale ?? "en";
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
  return issues;
}
