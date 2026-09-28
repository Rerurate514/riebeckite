import type { ConfigValidationIssue } from "@riebeckite/core";
import type {
  DiscordEmbedOptions,
  ResolvedDiscordEmbedOptions,
} from "./types.js";

/** Discord blurple, the accent color of the official embed card. */
export const DEFAULT_THEME_COLOR = "#5865F2";

/** Accepts `#rgb`, `#rgba`, `#rrggbb`, and `#rrggbbaa`. */
export const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function resolveDiscordEmbedOptions(
  options: DiscordEmbedOptions = {},
): ResolvedDiscordEmbedOptions {
  return {
    themeColor: options.themeColor ?? DEFAULT_THEME_COLOR,
    imageAlt: options.imageAlt ?? true,
    imageDimensions: options.imageDimensions ?? true,
  };
}

export function validateDiscordEmbedOptions(
  options: DiscordEmbedOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  if (
    options.themeColor !== undefined &&
    (typeof options.themeColor !== "string" ||
      !HEX_COLOR_PATTERN.test(options.themeColor))
  ) {
    issues.push({
      path: "themeColor",
      message: 'Expected a hex color such as "#5865F2".',
    });
  }
  for (const key of ["imageAlt", "imageDimensions"] as const) {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  }
  return issues;
}
