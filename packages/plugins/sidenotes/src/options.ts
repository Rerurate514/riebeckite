import type { ResolvedSidenotesOptions, SidenotesOptions } from "./types.js";

export const DEFAULT_SIDENOTES_ARIA_LABEL = "Sidenote";
export const DEFAULT_SIDENOTES_OPEN_LABEL = "Footnote";
export const DEFAULT_SIDENOTES_PLACEMENT = "end";

/**
 * Applies defaults to `SidenotesOptions`. Pure and deterministic so the
 * plugin can resolve options once and reuse them for every processed tree.
 */
export function resolveSidenotesOptions(
  options: SidenotesOptions = {},
): ResolvedSidenotesOptions {
  return {
    className: normalizeNonEmpty(options.className, ""),
    ariaLabel: normalizeNonEmpty(
      options.ariaLabel,
      DEFAULT_SIDENOTES_ARIA_LABEL,
    ),
    openLabel: normalizeNonEmpty(
      options.openLabel,
      DEFAULT_SIDENOTES_OPEN_LABEL,
    ),
    placement: normalizePlacement(
      options.placement,
      DEFAULT_SIDENOTES_PLACEMENT,
    ),
  };
}

function normalizeNonEmpty(
  value: string | undefined,
  fallback: string,
): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed === "" ? fallback : trimmed;
}

function normalizePlacement(
  value: "end" | "margin" | undefined,
  fallback: "end" | "margin",
): "end" | "margin" {
  return value === "margin" ? "margin" : value === "end" ? "end" : fallback;
}
