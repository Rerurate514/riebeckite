import type { ConfigValidationIssue } from "@riebeckite/core";
import type { PropertiesOptions, ResolvedPropertiesOptions } from "./types.js";

/** Attribute that marks a rendered property panel (also the idempotency guard). */
export const PROPERTIES_ATTRIBUTE = "data-properties";

export const DEFAULT_PROPERTIES_TITLE = "Properties";
export const DEFAULT_PROPERTIES_CLASS = "rb-properties";

/** Frontmatter keys that describe the build itself rather than the note. */
export const DEFAULT_PROPERTIES_EXCLUDE: readonly string[] = [
  "publish",
  "permalink",
  "aliases",
  "redirect_from",
];

/** Base route for tag links, matching the Obsidian Markdown tag renderer. */
export const DEFAULT_TAG_BASE = "/tags/";

export function resolvePropertiesOptions(
  options: PropertiesOptions = {},
): ResolvedPropertiesOptions {
  return {
    title:
      options.title === undefined ? DEFAULT_PROPERTIES_TITLE : options.title,
    position: options.position ?? "start",
    include: options.include,
    exclude: options.exclude ?? DEFAULT_PROPERTIES_EXCLUDE,
    hideEmpty: options.hideEmpty ?? true,
    className: options.className ?? DEFAULT_PROPERTIES_CLASS,
    collapsed: options.collapsed ?? false,
  };
}

export function validatePropertiesOptions(
  options: PropertiesOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];

  if (
    options.title !== undefined &&
    options.title !== null &&
    typeof options.title !== "string"
  ) {
    issues.push({ path: "title", message: "Expected a string or null." });
  }
  if (
    options.position !== undefined &&
    options.position !== "start" &&
    options.position !== "end"
  ) {
    issues.push({ path: "position", message: 'Expected "start" or "end".' });
  }
  for (const key of ["include", "exclude"] as const) {
    const value = options[key];
    if (value !== undefined && !isStringArray(value)) {
      issues.push({ path: key, message: "Expected an array of strings." });
    }
  }
  if (
    options.hideEmpty !== undefined &&
    typeof options.hideEmpty !== "boolean"
  ) {
    issues.push({ path: "hideEmpty", message: "Expected a boolean." });
  }
  if (
    options.className !== undefined &&
    (typeof options.className !== "string" || options.className.trim() === "")
  ) {
    issues.push({
      path: "className",
      message: "Expected a non-empty string.",
    });
  }
  if (
    options.collapsed !== undefined &&
    typeof options.collapsed !== "boolean"
  ) {
    issues.push({ path: "collapsed", message: "Expected a boolean." });
  }

  return issues;
}

function isStringArray(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}
