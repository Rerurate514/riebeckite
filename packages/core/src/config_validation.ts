import type { ConfigValidationIssue } from "./types/config_validation.js";
import type { RiebeckitePlugin } from "./types/plugin.js";
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

function validateConfigIssues(
  config: RiebeckiteConfig,
): ConfigValidationIssue[] {
  const issues: ConfigValidationIssue[] = [];
  const value: unknown = config;
  if (!isRecord(value)) {
    return [{ path: "config", message: "Expected an object." }];
  }

  validateSite(value.site, issues);
  validateNavigation(value.navigation, issues);
  validateContent(value.content, issues);
  validateTheme(value.theme, issues);
  validatePlugins(value.plugins, issues);
  return issues;
}

function validateNavigation(
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    issues.push({ path: "navigation", message: "Expected an object." });
    return;
  }

  validateNavigationItems(value.header, "navigation.header", issues, new Set());
  validateNavigationItems(value.footer, "navigation.footer", issues, new Set());
}

function validateNavigationItems(
  value: unknown,
  path: string,
  issues: ConfigValidationIssue[],
  ancestors: Set<object>,
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array." });
    return;
  }

  for (const [index, item] of value.entries()) {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(item)) {
      issues.push({ path: itemPath, message: "Expected an object." });
      continue;
    }
    if (ancestors.has(item)) {
      issues.push({
        path: itemPath,
        message: "Navigation children must not be recursive.",
      });
      continue;
    }

    validateRequiredString(item.label, `${itemPath}.label`, issues);
    validateRequiredString(item.href, `${itemPath}.href`, issues);
    validateOptionalBoolean(item.external, `${itemPath}.external`, issues);
    if (item.children !== undefined) {
      const nextAncestors = new Set(ancestors);
      nextAncestors.add(item);
      validateNavigationItems(
        item.children,
        `${itemPath}.children`,
        issues,
        nextAncestors,
      );
    }
  }
}

function validateSite(value: unknown, issues: ConfigValidationIssue[]): void {
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

function validateFeed(value: unknown, issues: ConfigValidationIssue[]): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    issues.push({ path: "site.feed", message: "Expected an object." });
    return;
  }

  validateOptionalString(value.title, "site.feed.title", issues);
  validateOptionalString(value.description, "site.feed.description", issues);
  validateOptionalString(value.language, "site.feed.language", issues);
}

function validateContent(
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

function validateContentSource(
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

function validatePublishStrategy(
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

function validateTheme(value: unknown, issues: ConfigValidationIssue[]): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    issues.push({ path: "theme", message: "Expected an object." });
    return;
  }

  validateThemeConfig(value, "theme", issues);
  validateThemeStyles(value.styles, "theme.styles", issues);

  if (value.config !== undefined) {
    if (!isRecord(value.config)) {
      issues.push({ path: "theme.config", message: "Expected an object." });
    } else {
      validateThemeConfig(value.config, "theme.config", issues);
    }
  }
}

function validateThemeConfig(
  value: Record<string, unknown>,
  path: string,
  issues: ConfigValidationIssue[],
): void {
  validateOptionalString(value.name, `${path}.name`, issues);
  validateOneOf(
    value.colorMode,
    `${path}.colorMode`,
    ["light", "dark", "system"],
    issues,
  );
  validateOneOf(
    value.typography,
    `${path}.typography`,
    ["system", "serif", "sans"],
    issues,
  );
  validateOneOf(
    value.articleLayout,
    `${path}.articleLayout`,
    ["article", "sidebar", "full-width"],
    issues,
  );
  validateStringArray(value.userCss, `${path}.userCss`, issues);
  if (value.attributes !== undefined && !isRecord(value.attributes)) {
    issues.push({ path: `${path}.attributes`, message: "Expected an object." });
  }
}

function validateThemeStyles(
  value: unknown,
  path: string,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array." });
    return;
  }
  for (const [index, style] of value.entries()) {
    if (!isRecord(style) || !isNonEmptyString(style.moduleSpecifier)) {
      issues.push({
        path: `${path}[${index}].moduleSpecifier`,
        message: "Expected a non-empty string.",
      });
    }
  }
}

function validatePlugins(
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

function validateCapabilityMetadata(
  plugin: RiebeckitePlugin,
  path: string,
  issues: ConfigValidationIssue[],
): void {
  validateStringArray(plugin.provides, `${path}.provides`, issues, true);
  validateStringArray(plugin.requires, `${path}.requires`, issues, true);
  validateStringArray(plugin.optional, `${path}.optional`, issues, true);
}

function validatePluginOptions(
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

function validateRequiredString(
  value: unknown,
  path: string,
  issues: ConfigValidationIssue[],
): void {
  if (!isNonEmptyString(value)) {
    issues.push({ path, message: "Expected a non-empty string." });
  }
}

function validateOptionalString(
  value: unknown,
  path: string,
  issues: ConfigValidationIssue[],
): void {
  if (value !== undefined && typeof value !== "string") {
    issues.push({ path, message: "Expected a string." });
  }
}

function validateOptionalBoolean(
  value: unknown,
  path: string,
  issues: ConfigValidationIssue[],
): void {
  if (value !== undefined && typeof value !== "boolean") {
    issues.push({ path, message: "Expected a boolean." });
  }
}

function validateAbsoluteUrl(
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

function validateStringArray(
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

function validateOneOf(
  value: unknown,
  path: string,
  choices: readonly string[],
  issues: ConfigValidationIssue[],
): void {
  if (
    value !== undefined &&
    (typeof value !== "string" || !choices.includes(value))
  ) {
    issues.push({ path, message: `Expected one of: ${choices.join(", ")}.` });
  }
}

function formatValidationIssues(
  issues: readonly ConfigValidationIssue[],
): string {
  return [
    "Invalid Riebeckite configuration:",
    ...issues.map((issue) => `\n${issue.path}\n  ${issue.message}`),
  ].join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
