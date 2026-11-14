import type { ResolvedSeriesOptions, SeriesOptions } from "./types.js";

export /** Base class applied when `options.className` is not set. */
const DEFAULT_SERIES_CLASS_NAME = "rb-series";

export const DEFAULT_SERIES_BASE_PATH = "/series";

/** Applies defaults to the user-supplied options. */
export function resolveSeriesOptions(
  options: SeriesOptions = {},
): ResolvedSeriesOptions {
  return {
    layout: options.layout === "wide" ? "wide" : "article",
    key: options.key ?? "series",
    orderKey: options.orderKey ?? "series_order",
    titleKey: options.titleKey ?? "series_title",
    heading: options.heading ?? true,
    className: options.className ?? DEFAULT_SERIES_CLASS_NAME,
    positionLabel: options.positionLabel ?? false,
    basePath: normalizeBasePath(options.basePath ?? DEFAULT_SERIES_BASE_PATH),
    localeMode:
      options.localeMode === "all" || options.localeMode === "fallback"
        ? options.localeMode
        : "current",
  };
}

export function seriesSlug(name: string): string {
  return name
    .split("/")
    .map((segment) => {
      const normalized = segment
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      return normalized === ""
        ? encodeURIComponent(segment.trim())
        : normalized;
    })
    .join("/");
}

export function normalizeBasePath(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return prefixed.length > 1 ? prefixed.replace(/\/+$/, "") : prefixed;
}
