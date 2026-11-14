import {
  isNonEmptyString,
  isRecord,
  toErrorMessage,
} from "./config_validation_part3.js";
import type { ConfigValidationIssue } from "./types/config_validation.js";
import type { RiebeckitePlugin } from "./types/plugin.js";

export function validatePublicationSchedule(
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    issues.push({
      path: "publication.schedule",
      message: "Expected an object.",
    });
    return;
  }
  validateOptionalBoolean(
    value.enabled,
    "publication.schedule.enabled",
    issues,
  );
  if (value.intervalMinutes === undefined) return;
  if (
    typeof value.intervalMinutes !== "number" ||
    !Number.isInteger(value.intervalMinutes) ||
    value.intervalMinutes < 5 ||
    value.intervalMinutes > 59
  ) {
    issues.push({
      path: "publication.schedule.intervalMinutes",
      message: "Expected an integer between 5 and 59.",
    });
  }
}

export function validateSpa(
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined || typeof value === "boolean" || isRecord(value)) {
    return;
  }
  issues.push({ path: "spa", message: "Expected a boolean or an object." });
}

export function validateTheme(
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    issues.push({ path: "theme", message: "Expected an object." });
  } else if (!("definition" in value && "options" in value)) {
    issues.push({ path: "theme", message: "Expected a theme instance." });
  }
}

export function validatePlugins(
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push({ path: "plugins", message: "Expected an array." });
    return;
  }

  const names = new Map<string, number>();
  for (const [index, input] of value.entries()) {
    if (input === false || input === null || input === undefined) continue;
    if (!isRecord(input)) {
      issues.push({ path: `plugins[${index}]`, message: "Expected a plugin." });
      continue;
    }

    const plugin = input as RiebeckitePlugin;
    const path = `plugins[${index}]`;
    if (!isNonEmptyString(plugin.name)) {
      issues.push({
        path: `${path}.name`,
        message: "Expected a non-empty string.",
      });
    } else if (plugin.enabled !== false) {
      const duplicateIndex = names.get(plugin.name);
      if (duplicateIndex !== undefined) {
        issues.push({
          path: `${path}.name`,
          message: `Duplicate plugin name "${plugin.name}" (also plugins[${duplicateIndex}]).`,
        });
      } else {
        names.set(plugin.name, index);
      }
    }

    validateOptionalBoolean(plugin.enabled, `${path}.enabled`, issues);
    validateCapabilityMetadata(plugin, path, issues);
    if (plugin.enabled !== false) validatePluginOptions(plugin, path, issues);
  }
}

export function validateCapabilityMetadata(
  plugin: RiebeckitePlugin,
  path: string,
  issues: ConfigValidationIssue[],
): void {
  validateStringArray(plugin.provides, `${path}.provides`, issues, true);
  validateStringArray(plugin.requires, `${path}.requires`, issues, true);
  validateStringArray(plugin.optional, `${path}.optional`, issues, true);
}

export function validatePluginOptions(
  plugin: RiebeckitePlugin,
  path: string,
  issues: ConfigValidationIssue[],
): void {
  if (!plugin.validateOptions) return;

  try {
    const optionIssues = plugin.validateOptions(plugin.options) ?? [];
    for (const issue of optionIssues) {
      issues.push({
        path: issue.path ? `${path}.options.${issue.path}` : `${path}.options`,
        message: issue.message,
      });
    }
  } catch (error) {
    issues.push({
      path: `${path}.options`,
      message: `Validator failed: ${toErrorMessage(error)}`,
    });
  }
}

export function validateRequiredString(
  value: unknown,
  path: string,
  issues: ConfigValidationIssue[],
): void {
  if (!isNonEmptyString(value)) {
    issues.push({ path, message: "Expected a non-empty string." });
  }
}

export function validateOptionalString(
  value: unknown,
  path: string,
  issues: ConfigValidationIssue[],
): void {
  if (value !== undefined && typeof value !== "string") {
    issues.push({ path, message: "Expected a string." });
  }
}

export function validateOptionalBoolean(
  value: unknown,
  path: string,
  issues: ConfigValidationIssue[],
): void {
  if (value !== undefined && typeof value !== "boolean") {
    issues.push({ path, message: "Expected a boolean." });
  }
}

export function validateAbsoluteUrl(
  value: unknown,
  path: string,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined || value === "") return;
  if (typeof value !== "string") {
    issues.push({ path, message: "Expected an absolute URL." });
    return;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:")
      throw new Error();
  } catch {
    issues.push({ path, message: "Expected an absolute HTTP(S) URL." });
  }
}

export function validateStringArray(
  value: unknown,
  path: string,
  issues: ConfigValidationIssue[],
  nonEmpty = false,
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array." });
    return;
  }
  for (const [index, item] of value.entries()) {
    if (typeof item !== "string" || (nonEmpty && !item.trim())) {
      issues.push({
        path: `${path}[${index}]`,
        message: nonEmpty
          ? "Expected a non-empty string."
          : "Expected a string.",
      });
    }
  }
}

export function formatValidationIssues(
  issues: readonly ConfigValidationIssue[],
): string {
  return [
    "Invalid Riebeckite configuration:",
    ...issues.map((issue) => `\n${issue.path}\n  ${issue.message}`),
  ].join("\n");
}
