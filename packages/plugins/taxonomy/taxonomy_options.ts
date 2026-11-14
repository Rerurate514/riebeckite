import {
  type ConfigValidationIssue,
  type ContentManifestEntry,
  type ResolvedRiebeckiteConfig,
  resolvePlugins,
} from "@riebeckite/core";
import { resolveTaxonomyOptions } from "./src/options.js";
import type {
  ResolvedTaxonomyOptions,
  TaxonomyFeedFormat,
  TaxonomyOptions,
} from "./src/types.js";
import { TAXONOMY_PLUGIN_NAME } from "./taxonomy_constants.js";

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

export function enabledFormats(
  resolved: ResolvedTaxonomyOptions,
): TaxonomyFeedFormat[] {
  const formats: TaxonomyFeedFormat[] = [];
  if (resolved.feeds.rss) formats.push("rss");
  if (resolved.feeds.atom) formats.push("atom");
  if (resolved.feeds.json) formats.push("json");
  return formats;
}

export function feedFilePath(path: string, format: TaxonomyFeedFormat): string {
  const base = path.replace(/^\/+/, "");
  if (format === "rss") return `${base}/feed.xml`;
  if (format === "atom") return `${base}/atom.xml`;
  return `${base}/feed.json`;
}

export function validateTaxonomyOptions(
  options: TaxonomyOptions | undefined,
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

  if (!Array.isArray(options.exclude)) {
    if (options.exclude !== undefined) {
      issues.push({ path: "exclude", message: "Expected an array." });
    }
  } else {
    options.exclude.forEach((slug, index) => {
      if (typeof slug !== "string" || slug.trim() === "") {
        issues.push({
          path: `exclude[${index}]`,
          message: "Expected a non-empty string.",
        });
      }
    });
  }

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

export function isExcludedEntry(
  entry: ContentManifestEntry,
  excludedSlugs: readonly string[],
): boolean {
  const slug = entry.slug;
  return excludedSlugs.some(
    (excluded) => slug === excluded || slug.startsWith(`${excluded}/`),
  );
}
