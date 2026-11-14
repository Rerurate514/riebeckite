import type { ConfigValidationIssue } from "@riebeckite/core";
import { isRecord } from "./icons_resolve_core.js";
import { PRECEDENCE, SOURCES } from "./icons_resolve_options.js";
import type { IconsOptions } from "./types.js";

export function validateIconsOptions(
  options: IconsOptions | undefined,
): readonly ConfigValidationIssue[] | undefined {
  if (options === undefined) return undefined;
  const issues: ConfigValidationIssue[] = [];
  if (options.sources !== undefined) {
    if (!Array.isArray(options.sources) || options.sources.length === 0) {
      issues.push({ path: "sources", message: "must be a non-empty array." });
    } else {
      const seen = new Set<string>();
      options.sources.forEach((source, index) => {
        if (!SOURCES.has(source)) {
          issues.push({
            path: `sources[${index}]`,
            message: `unknown source "${String(source)}".`,
          });
        } else if (seen.has(source)) {
          issues.push({
            path: `sources[${index}]`,
            message: `duplicate source "${source}".`,
          });
        }
        seen.add(source);
      });
    }
  }
  if (options.precedence !== undefined) {
    if (!Array.isArray(options.precedence) || options.precedence.length === 0) {
      issues.push({
        path: "precedence",
        message: "must be a non-empty array.",
      });
    } else {
      const seen = new Set<string>();
      options.precedence.forEach((source, index) => {
        if (!PRECEDENCE.has(source)) {
          issues.push({
            path: `precedence[${index}]`,
            message: `unknown precedence "${String(source)}".`,
          });
        } else if (seen.has(source)) {
          issues.push({
            path: `precedence[${index}]`,
            message: `duplicate precedence "${source}".`,
          });
        }
        seen.add(source);
      });
    }
  }
  for (const key of ["inline", "frontmatter", "colors"] as const) {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      issues.push({ path: key, message: "must be a boolean." });
    }
  }
  if (options.overrides !== undefined) {
    if (!isRecord(options.overrides)) {
      issues.push({ path: "overrides", message: "must be an object." });
    } else {
      for (const [key, value] of Object.entries(options.overrides)) {
        if (typeof value === "string") continue;
        if (
          !isRecord(value) ||
          typeof value.icon !== "string" ||
          (value.color !== undefined && typeof value.color !== "string")
        ) {
          issues.push({
            path: `overrides.${key}`,
            message: "must be a string or an object with an icon string.",
          });
        }
      }
    }
  }
  for (const key of ["vaultRoot", "vaultPrefix"] as const) {
    if (options[key] !== undefined && typeof options[key] !== "string") {
      issues.push({ path: key, message: "must be a string." });
    }
  }
  for (const key of ["iconize", "iconic"] as const) {
    const value = options[key];
    if (value !== undefined && !isRecord(value)) {
      issues.push({ path: key, message: "must be an object." });
    }
  }
  return issues.length > 0 ? issues : undefined;
}
