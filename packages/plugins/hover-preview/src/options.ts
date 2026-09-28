import type {
  HoverPreviewOptions,
  ResolvedHoverPreviewOptions,
} from "./types.js";

export const DEFAULT_HOVER_PREVIEW_DELAY = 120;
export const DEFAULT_HOVER_PREVIEW_EXCERPT_LENGTH = 160;
export const DEFAULT_HOVER_PREVIEW_SELECTOR = 'a[href^="/"]';
export const DEFAULT_HOVER_PREVIEW_CLASS = "rb-hover-preview";

export function resolveHoverPreviewOptions(
  options: HoverPreviewOptions = {},
): ResolvedHoverPreviewOptions {
  return {
    delay: normalizeNonNegative(options.delay, DEFAULT_HOVER_PREVIEW_DELAY),
    excerptLength: normalizePositive(
      options.excerptLength,
      DEFAULT_HOVER_PREVIEW_EXCERPT_LENGTH,
    ),
    maxEntries: normalizeMaxEntries(options.maxEntries),
    selector: normalizeString(options.selector, DEFAULT_HOVER_PREVIEW_SELECTOR),
    className: normalizeString(options.className, DEFAULT_HOVER_PREVIEW_CLASS),
    includeTitles: options.includeTitles ?? true,
  };
}

function normalizeNonNegative(value: number | undefined, fallback: number) {
  return value === undefined || !Number.isFinite(value) || value < 0
    ? fallback
    : value;
}

function normalizePositive(value: number | undefined, fallback: number) {
  return value === undefined || !Number.isFinite(value) || value <= 0
    ? fallback
    : value;
}

function normalizeMaxEntries(value: number | undefined) {
  return value === undefined || !Number.isInteger(value) || value < 1
    ? undefined
    : value;
}

function normalizeString(value: string | undefined, fallback: string) {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : fallback;
}
