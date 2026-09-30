import type { MapOptions, ResolvedMapOptions } from "./types.js";

/** Default base class for the generated figure. */
export const DEFAULT_MAP_CLASS_NAME = "rr-map";

/** Default map height in pixels. */
export const DEFAULT_MAP_HEIGHT = 320;

/** Default fenced-code language. */
export const DEFAULT_MAP_LANGUAGE = "map";

/** Default zoom level. */
export const DEFAULT_MAP_ZOOM = 13;

/** Default minimum zoom level. */
export const DEFAULT_MAP_MIN_ZOOM = 1;

/** Default maximum zoom level (OpenStreetMap's standard maximum). */
export const DEFAULT_MAP_MAX_ZOOM = 19;

/** Frontmatter property read for coordinates by default. */
export const DEFAULT_MAP_FRONTMATTER_KEY = "map";

/**
 * Default OpenStreetMap tile template. It is keyless and safe to expose to the
 * browser, but sites with meaningful traffic should follow the tile usage
 * policy or point `tileUrl` at their own tile server.
 */
export const DEFAULT_MAP_TILE_URL =
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

/** Attribution required by the default tile provider. */
export const DEFAULT_MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Applies defaults to the user-provided options.
 *
 * Shared by the plugin factory (for validation and `publicConfig`) and the
 * rehype transformer (for figure emission), so both agree on one resolution.
 */
export function resolveMapOptions(
  options: MapOptions = {},
): ResolvedMapOptions {
  return {
    language: normalizeText(options.language, DEFAULT_MAP_LANGUAGE),
    className: normalizeText(options.className, DEFAULT_MAP_CLASS_NAME),
    height: normalizePositive(options.height, DEFAULT_MAP_HEIGHT),
    zoom: clampZoom(options.zoom ?? DEFAULT_MAP_ZOOM),
    minZoom: clampZoom(options.minZoom ?? DEFAULT_MAP_MIN_ZOOM, 0),
    maxZoom: clampZoom(options.maxZoom ?? DEFAULT_MAP_MAX_ZOOM, 0),
    tileUrl: normalizeText(options.tileUrl, DEFAULT_MAP_TILE_URL),
    attribution: normalizeText(options.attribution, DEFAULT_MAP_ATTRIBUTION),
    fallback: options.fallback !== false,
    staticFallback: options.staticFallback !== false,
    staticImageUrl: normalizeOptionalText(options.staticImageUrl),
    frontmatterKey: normalizeText(
      options.frontmatterKey,
      DEFAULT_MAP_FRONTMATTER_KEY,
    ),
  };
}

function normalizeText(value: string | undefined, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed === "" ? fallback : trimmed;
}

function normalizeOptionalText(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizePositive(
  value: number | undefined,
  fallback: number,
): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function clampZoom(value: number, minimum = 1): number {
  if (!Number.isFinite(value)) return minimum;
  const rounded = Math.round(value);
  if (rounded < minimum) return minimum;
  if (rounded > 19) return 19;
  return rounded;
}
