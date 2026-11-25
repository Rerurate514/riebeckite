import type { UiLabelDictionaries } from "@riebeckite/ui";
import { resolveUiLabels } from "@riebeckite/ui";
import { sidenotesLabels } from "./labels.js";
import type { ResolvedSidenotesOptions, SidenotesOptions } from "./types.js";

/**
 * Resolves labels for sidenotes optionally using a language/overrides.
 * When language is provided, labels are resolved per call; otherwise English
 * defaults are kept.
 */
function resolveSidenotesLabels(
  language?: string,
  overrides?: Readonly<Record<string, UiLabelDictionaries>>,
): { ariaLabel: string; openLabel: string } {
  const resolved = resolveUiLabels(sidenotesLabels, language, overrides);
  return {
    ariaLabel: resolved.ariaLabel,
    openLabel: resolved.openLabel,
  };
}

/**
 * Applies defaults to `SidenotesOptions`. Pure and deterministic so the
 * plugin can resolve options once and reuse them for every processed tree.
 * If language is available from the render input, labels are resolved per call.
 */
export function resolveSidenotesOptions(
  options: SidenotesOptions = {},
  language?: string,
  overrides?: Readonly<Record<string, UiLabelDictionaries>>,
): ResolvedSidenotesOptions {
  const { ariaLabel: resolvedAriaLabel, openLabel: resolvedOpenLabel } =
    resolveSidenotesLabels(language, overrides);
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
