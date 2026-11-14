import {
  formatValidationIssues,
  validateAbsoluteUrl,
  validateOptionalBoolean,
  validateOptionalString,
  validatePlugins,
  validatePublicationSchedule,
  validateRequiredString,
  validateSpa,
  validateStringArray,
  validateTheme,
} from "./config_validation_part2.js";
import { isRecord } from "./config_validation_part3.js";
import type { ConfigValidationIssue } from "./types/config_validation.js";
import type { RiebeckiteConfig } from "./types/riebeckite_config.js";

export class ConfigValidationError extends Error {
  readonly issues: readonly ConfigValidationIssue[];

  constructor(issues: readonly ConfigValidationIssue[]) {
    super(formatValidationIssues(issues));
    this.name = "ConfigValidationError";
    this.issues = issues;
  }
}

export function validateConfig(config: RiebeckiteConfig): void {
  const issues = validateConfigIssues(config);
  if (issues.length > 0) throw new ConfigValidationError(issues);
}

export function validateConfigIssues(
  config: RiebeckiteConfig,
): ConfigValidationIssue[] {
  const issues: ConfigValidationIssue[] = [];
  const value: unknown = config;
  if (!isRecord(value)) {
    return [{ path: "config", message: "Expected an object." }];
  }

  validateSite(value.site, issues);
  validateContent(value.content, issues);
  validateCache(value.cache, issues);
  validateProvenance(value.provenance, issues);
  validatePublication(value.publication, issues);
  validateSpa(value.spa, issues);
  validateTheme(value.theme, issues);
  validatePlugins(value.plugins, issues);
  return issues;
}

export function validateSite(
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (!isRecord(value)) {
    issues.push({ path: "site", message: "Expected an object." });
    return;
  }

  validateRequiredString(value.title, "site.title", issues);
  validateOptionalString(value.description, "site.description", issues);
  validateOptionalString(value.author, "site.author", issues);
  validateOptionalString(value.locale, "site.locale", issues);
  validateOptionalString(value.twitterSite, "site.twitterSite", issues);
  validateOptionalString(value.defaultOgImage, "site.defaultOgImage", issues);
  validateAbsoluteUrl(value.baseUrl, "site.baseUrl", issues);
  validateFeed(value.feed, issues);
}

export function validateFeed(
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    issues.push({ path: "site.feed", message: "Expected an object." });
    return;
  }

  validateOptionalString(value.title, "site.feed.title", issues);
  validateOptionalString(value.description, "site.feed.description", issues);
  validateOptionalString(value.language, "site.feed.language", issues);
}

export function validateContent(
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    issues.push({ path: "content", message: "Expected an object." });
    return;
  }

  validateOptionalString(value.directory, "content.directory", issues);
  validateContentSource(value.source, issues);
  validateStringArray(value.exclude, "content.exclude", issues);
  validatePublishStrategy(value.filters, issues);
}

export function validateContentSource(
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    issues.push({
      path: "content.source",
      message: "Expected a ContentSource.",
    });
    return;
  }
  if (typeof value.scan !== "function") {
    issues.push({
      path: "content.source.scan",
      message: "Expected a function.",
    });
  }
  if (typeof value.read !== "function") {
    issues.push({
      path: "content.source.read",
      message: "Expected a function.",
    });
  }
}

export function validatePublishStrategy(
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    issues.push({ path: "content.filters", message: "Expected an object." });
    return;
  }
  if (
    value.publishStrategy !== undefined &&
    value.publishStrategy !== "explicit" &&
    value.publishStrategy !== "selective"
  ) {
    issues.push({
      path: "content.filters.publishStrategy",
      message: 'Expected "explicit" or "selective".',
    });
  }
}

export function validateCache(
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    issues.push({ path: "cache", message: "Expected an object." });
    return;
  }

  validateOptionalBoolean(value.enabled, "cache.enabled", issues);
  validateOptionalString(value.directory, "cache.directory", issues);
}

export function validateProvenance(
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    issues.push({ path: "provenance", message: "Expected an object." });
    return;
  }
  validateOptionalBoolean(value.enabled, "provenance.enabled", issues);
}

export function validatePublication(
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    issues.push({ path: "publication", message: "Expected an object." });
    return;
  }
  if (
    value.requireApproval !== undefined &&
    typeof value.requireApproval !== "boolean"
  ) {
    issues.push({
      path: "publication.requireApproval",
      message: "Expected a boolean.",
    });
  }
  validateOptionalString(
    value.approvalFile,
    "publication.approvalFile",
    issues,
  );
  if (
    typeof value.approvalFile === "string" &&
    value.approvalFile.trim().length === 0
  ) {
    issues.push({
      path: "publication.approvalFile",
      message: "Expected a non-empty path.",
    });
  }
  validatePublicationSchedule(value.schedule, issues);
}
