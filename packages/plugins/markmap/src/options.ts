import type { MarkmapOptions, MarkmapResolvedOptions } from "./types.js";

/** Default base class for the generated figure. */
export const DEFAULT_MARKMAP_CLASS_NAME = "rb-markmap";

/** Default canvas height in pixels. */
export const DEFAULT_MARKMAP_HEIGHT = 320;

/** Default fenced-code language. */
export const DEFAULT_MARKMAP_LANGUAGE = "markmap";

/**
 * Applies defaults to the user-provided options.
 *
 * Shared by the plugin factory (for metadata/validation) and the rehype
 * transformer (for figure emission), so both agree on a single resolution.
 */
export function resolveMarkmapOptions(
  options: MarkmapOptions = {},
): MarkmapResolvedOptions {
  return {
    caption: options.caption !== false,
    height: normalizeHeight(options.height),
    className: options.className?.trim() || DEFAULT_MARKMAP_CLASS_NAME,
    language: options.language?.trim() || DEFAULT_MARKMAP_LANGUAGE,
    fallback: options.fallback !== false,
    colorFreezeLevel: normalizeColorFreezeLevel(options.colorFreezeLevel),
  };
}

function normalizeHeight(height: number | undefined): number {
  return typeof height === "number" && Number.isFinite(height) && height > 0
    ? height
    : DEFAULT_MARKMAP_HEIGHT;
}

function normalizeColorFreezeLevel(
  level: number | undefined,
): number | null {
  return typeof level === "number" && Number.isInteger(level) && level >= 0
    ? level
    : null;
}
