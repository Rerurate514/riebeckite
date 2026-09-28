import type {
  InspectOptions,
  QualityOptions,
  ResolvedInspectOptions,
  ResolvedQualityOptions,
} from "./types.js";

/**
 * Normalizes inspection options. Accessibility inspection is on by default and
 * must be disabled explicitly with `a11y: { enabled: false }`.
 */
export function resolveInspectOptions(
  options: InspectOptions = {},
): ResolvedInspectOptions {
  return {
    enabled: options.a11y?.enabled !== false,
    ignoreRules: new Set(options.ignoreRules ?? []),
  };
}

/**
 * Normalizes plugin options. `failOn` defaults to `"never"`, matching the
 * diagnostics plugin's opt-in failure behavior.
 */
export function resolveQualityOptions(
  options: QualityOptions = {},
): ResolvedQualityOptions {
  return {
    inspect: resolveInspectOptions(options),
    failOn: options.failOn === "error" ? "error" : "never",
  };
}
