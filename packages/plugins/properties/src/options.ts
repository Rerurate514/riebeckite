import type { ConfigValidationIssue } from "@riebeckite/core";
import { isValidDatePattern } from "./date.js";
import type {
  PropertiesFieldConfig,
  PropertiesOptions,
  ResolvedPropertiesOptions,
} from "./types.js";

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

const FIELD_TYPES = [
  "text",
  "link",
  "tags",
  "badge",
  "date",
  "wikilinks",
] as const;

const TAG_VARIANTS = ["text", "links", "chips"] as const;

const FIELD_OPTIONS: Readonly<Record<string, readonly string[]>> = {
  text: ["type"],
  link: ["type"],
  tags: ["type", "link", "tagBase", "variant"],
  badge: ["type", "variants"],
  date: ["type", "format"],
  wikilinks: ["type"],
};

export function resolvePropertiesOptions(
  options: PropertiesOptions = {},
): ResolvedPropertiesOptions {
  const fields = options.fields ?? {};
  const fieldOrder = Object.keys(fields);
  return {
    title:
      options.title === undefined ? DEFAULT_PROPERTIES_TITLE : options.title,
    include: options.include,
    exclude: options.exclude ?? DEFAULT_PROPERTIES_EXCLUDE,
    order: options.order ?? (fieldOrder.length > 0 ? fieldOrder : undefined),
    hideEmpty: options.hideEmpty ?? true,
    className: options.className ?? DEFAULT_PROPERTIES_CLASS,
    collapsed: options.collapsed ?? false,
    fields,
  };
}

export function mergePropertiesOptions(
  base: PropertiesOptions | undefined,
  override: PropertiesOptions | undefined,
): PropertiesOptions {
  const fields = { ...base?.fields, ...override?.fields };
  return {
    ...base,
    ...override,
    ...(Object.keys(fields).length > 0 ? { fields } : {}),
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
  for (const key of ["include", "exclude"] as const) {
    const value = options[key];
    if (value !== undefined && !isStringArray(value)) {
      issues.push({ path: key, message: "Expected an array of strings." });
    }
  }
  if (options.order !== undefined && !isNonEmptyStringArray(options.order)) {
    issues.push({
      path: "order",
      message: "Expected an array of non-empty strings.",
    });
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
  if (options.fields !== undefined) validateFields(options.fields, issues);

  return issues;
}

function validateFields(
  fields: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (!isRecord(fields)) {
    issues.push({ path: "fields", message: "Expected an object." });
    return;
  }

  for (const [key, input] of Object.entries(fields)) {
    const path = `fields.${key}`;
    if (key.trim() === "") {
      issues.push({ path, message: "Expected a non-empty property key." });
      continue;
    }
    if (!isRecord(input)) {
      issues.push({ path, message: "Expected a field configuration object." });
      continue;
    }

    const type = input.type;
    if (typeof type !== "string" || !isFieldType(type)) {
      issues.push({
        path: `${path}.type`,
        message: `Expected one of: ${FIELD_TYPES.join(", ")}.`,
      });
      continue;
    }

    validateFieldOptions(path, input, type, issues);
    validateFieldType(path, input, type, issues);
  }
}

function validateFieldOptions(
  path: string,
  input: Record<string, unknown>,
  type: keyof typeof FIELD_OPTIONS,
  issues: ConfigValidationIssue[],
): void {
  const allowed = FIELD_OPTIONS[type];
  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) {
      issues.push({
        path: `${path}.${key}`,
        message: `Unknown option for type "${type}".`,
      });
    }
  }
}

function validateFieldType(
  path: string,
  input: Record<string, unknown>,
  type: keyof typeof FIELD_OPTIONS,
  issues: ConfigValidationIssue[],
): void {
  switch (type) {
    case "tags":
      validateOptionalBoolean(input.link, `${path}.link`, issues);
      validateOptionalNonEmptyString(input.tagBase, `${path}.tagBase`, issues);
      validateOneOf(input.variant, `${path}.variant`, TAG_VARIANTS, issues);
      return;
    case "badge":
      validateBadgeVariants(input.variants, `${path}.variants`, issues);
      return;
    case "date":
      if (input.format !== undefined) {
        if (
          typeof input.format !== "string" ||
          !isValidDatePattern(input.format)
        ) {
          issues.push({
            path: `${path}.format`,
            message:
              "Expected a date pattern using yyyy, MM, dd, HH, mm, and ss.",
          });
        }
      }
      return;
    default:
      return;
  }
}

function validateBadgeVariants(
  value: unknown,
  path: string,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object of variant names." });
    return;
  }
  for (const [key, variant] of Object.entries(value)) {
    if (typeof variant !== "string" || variant.trim() === "") {
      issues.push({
        path: `${path}.${key}`,
        message: "Expected a non-empty variant name.",
      });
    }
  }
}

function validateOptionalNonEmptyString(
  value: unknown,
  path: string,
  issues: ConfigValidationIssue[],
): void {
  if (
    value !== undefined &&
    (typeof value !== "string" || value.trim() === "")
  ) {
    issues.push({ path, message: "Expected a non-empty string." });
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
    issues.push({
      path,
      message: `Expected one of: ${choices.join(", ")}.`,
    });
  }
}

function isFieldType(value: string): value is keyof typeof FIELD_OPTIONS {
  return Object.hasOwn(FIELD_OPTIONS, value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isNonEmptyStringArray(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim() !== "")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function propertiesFieldConfig(
  fields: Readonly<Record<string, PropertiesFieldConfig>>,
  key: string,
): PropertiesFieldConfig | undefined {
  return Object.hasOwn(fields, key) ? fields[key] : undefined;
}
