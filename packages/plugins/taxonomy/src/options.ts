import type { ResolvedTaxonomyOptions, TaxonomyOptions } from "./types.js";

export const DEFAULT_TAXONOMY_TAGS_BASE_PATH = "/tags";
export const DEFAULT_TAXONOMY_FOLDERS_BASE_PATH = "/folders";
export const DEFAULT_TAXONOMY_MIN_ENTRIES = 1;
export const DEFAULT_TAXONOMY_RELATED_LIMIT = 8;
export const DEFAULT_TAXONOMY_FEED_LIMIT = 50;
export const DEFAULT_TAXONOMY_CLASS_NAME = "rr-taxonomy";
export const DEFAULT_TAXONOMY_DATA_ENDPOINT = "/taxonomy/index.json";

/**
 * Applies defaults to `TaxonomyOptions`. Pure and deterministic so the plugin
 * resolves options once and reuses them for data, feeds, SEO, and locations.
 */
export function resolveTaxonomyOptions(
  options: TaxonomyOptions = {},
): ResolvedTaxonomyOptions {
  return {
    tags: options.tags ?? true,
    folders: options.folders ?? true,
    tagsBasePath: normalizeBasePath(
      options.tagsBasePath,
      DEFAULT_TAXONOMY_TAGS_BASE_PATH,
    ),
    foldersBasePath: normalizeBasePath(
      options.foldersBasePath,
      DEFAULT_TAXONOMY_FOLDERS_BASE_PATH,
    ),
    folderDepth: normalizeCount(options.folderDepth, 0),
    minEntries: normalizeMinEntries(options.minEntries),
    related: options.related ?? true,
    relatedLimit: normalizeCount(
      options.relatedLimit,
      DEFAULT_TAXONOMY_RELATED_LIMIT,
    ),
    folderIndexes: options.folderIndexes ?? false,
    feeds: {
      rss: options.feeds?.rss ?? true,
      atom: options.feeds?.atom ?? true,
      json: options.feeds?.json ?? true,
    },
    feedLimit: normalizeCount(options.feedLimit, DEFAULT_TAXONOMY_FEED_LIMIT),
    className: normalizeClassName(options.className),
    dataEndpoint: normalizeDataEndpoint(options.dataEndpoint),
    resolveTitle: options.resolveTitle,
  };
}

function normalizeBasePath(
  value: string | undefined,
  fallback: string,
): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().replace(/\/+$/, "");
  if (trimmed === "") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function normalizeCount(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback;
}

function normalizeMinEntries(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : DEFAULT_TAXONOMY_MIN_ENTRIES;
}

function normalizeClassName(value: string | undefined): string {
  if (typeof value !== "string") return DEFAULT_TAXONOMY_CLASS_NAME;
  const trimmed = value.trim();
  return trimmed === "" ? DEFAULT_TAXONOMY_CLASS_NAME : trimmed;
}

function normalizeDataEndpoint(value: string | undefined): string {
  if (typeof value !== "string") return DEFAULT_TAXONOMY_DATA_ENDPOINT;
  const trimmed = value.trim();
  if (trimmed === "" || !trimmed.startsWith("/")) {
    return DEFAULT_TAXONOMY_DATA_ENDPOINT;
  }
  return trimmed;
}
