import type { ResolvedSidenotesOptions, SidenotesOptions } from "./types.js";

export const DEFAULT_SIDENOTES_ARIA_LABEL = "Sidenote";
export const DEFAULT_SIDENOTES_OPEN_LABEL = "Footnote";
export const DEFAULT_SIDENOTES_CLOSE_LABEL = "Close sidenote";
export const DEFAULT_SIDENOTES_POPOVER_ALIGNMENT = "bottom";

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
    closeLabel: normalizeNonEmpty(
      options.closeLabel,
      DEFAULT_SIDENOTES_CLOSE_LABEL,
    ),
    popoverAlignment: normalizePopoverAlignment(
      options.popoverAlignment,
      DEFAULT_SIDENOTES_POPOVER_ALIGNMENT,
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

function normalizePopoverAlignment(
  value: "bottom" | "end" | undefined,
  fallback: "bottom" | "end",
): "bottom" | "end" {
  return value === "end" ? "end" : value === "bottom" ? "bottom" : fallback;
}
