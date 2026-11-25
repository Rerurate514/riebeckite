import type { UiLabelContext } from "@riebeckite/core";
import { resolveUiLabels } from "@riebeckite/ui";
import { sidenotesLabels } from "./labels.js";
import type { ResolvedSidenotesOptions, SidenotesOptions } from "./types.js";

/**
 */
function resolveSidenotesLabels(uiLabels?: UiLabelContext): {
  ariaLabel: string;
  openLabel: string;
} {
  const resolved = resolveUiLabels(sidenotesLabels, uiLabels);
  return {
    ariaLabel: resolved.ariaLabel,
    openLabel: resolved.openLabel,
  };
}

/**
 * Applies defaults to `SidenotesOptions`. Pure and deterministic so the
 * plugin can resolve options once and reuse them for every processed tree.
 */
export function resolveSidenotesOptions(
  options: SidenotesOptions = {},
  uiLabels?: UiLabelContext,
): ResolvedSidenotesOptions {
  const { ariaLabel: resolvedAriaLabel, openLabel: resolvedOpenLabel } =
    resolveSidenotesLabels(uiLabels);
  return {
    className: normalizeNonEmpty(options.className, ""),
    ariaLabel: normalizeNonEmpty(options.ariaLabel, resolvedAriaLabel),
    openLabel: normalizeNonEmpty(options.openLabel, resolvedOpenLabel),
    placement: normalizePlacement(options.placement, "end"),
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
