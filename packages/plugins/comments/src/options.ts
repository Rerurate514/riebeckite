import type { ConfigValidationIssue } from "@riebeckite/core";
import type {
  CommentsOptions,
  CommentsPublicConfig,
  GiscusInputPosition,
  GiscusMapping,
  ResolvedCommentsOptions,
} from "./types.js";

export const DEFAULT_COMMENTS_CLASS_NAME = "rr-comments";
export const DEFAULT_GISCUS_MAPPING: GiscusMapping = "pathname";
export const DEFAULT_GISCUS_THEME = "preferred_color_scheme";
export const DEFAULT_GISCUS_LANG = "en";
export const GISCUS_MAPPINGS: readonly GiscusMapping[] = [
  "pathname",
  "url",
  "title",
  "og:title",
];
export const GISCUS_INPUT_POSITIONS: readonly GiscusInputPosition[] = [
  "top",
  "bottom",
];

export function resolveCommentsOptions(
  options: CommentsOptions,
): ResolvedCommentsOptions {
  return {
    repo: normalizeNonEmpty(options.repo, ""),
    repoId: normalizeNonEmpty(options.repoId, ""),
    category: normalizeNonEmpty(options.category, ""),
    categoryId: normalizeNonEmpty(options.categoryId, ""),
    mapping: isOneOf(options.mapping, GISCUS_MAPPINGS)
      ? options.mapping
      : DEFAULT_GISCUS_MAPPING,
    strict: options.strict ?? false,
    reactionsEnabled: options.reactionsEnabled ?? true,
    inputPosition: isOneOf(options.inputPosition, GISCUS_INPUT_POSITIONS)
      ? options.inputPosition
      : "bottom",
    theme: normalizeNonEmpty(options.theme, DEFAULT_GISCUS_THEME),
    lang: normalizeNonEmpty(options.lang, DEFAULT_GISCUS_LANG),
    className: normalizeNonEmpty(
      options.className,
      DEFAULT_COMMENTS_CLASS_NAME,
    ),
  };
}

export function resolveCommentsPublicConfig(
  options: CommentsOptions,
): CommentsPublicConfig {
  const resolved = resolveCommentsOptions(options);
  return {
    repo: resolved.repo,
    repoId: resolved.repoId,
    category: resolved.category,
    categoryId: resolved.categoryId,
    mapping: resolved.mapping,
    strict: resolved.strict ? "1" : "0",
    reactionsEnabled: resolved.reactionsEnabled ? "1" : "0",
    inputPosition: resolved.inputPosition,
    theme: resolved.theme,
    lang: resolved.lang,
  };
}

export function validateCommentsOptions(
  options: CommentsOptions | undefined,
): readonly ConfigValidationIssue[] {
  const value = options ?? ({} as CommentsOptions);
  const issues: ConfigValidationIssue[] = [];

  for (const key of ["repoId", "category", "categoryId"] as const) {
    const field = value[key];
    if (typeof field !== "string" || field.trim() === "") {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  }

  for (const key of ["theme", "lang", "className"] as const) {
    const field = value[key];
    if (
      field !== undefined &&
      (typeof field !== "string" || field.trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  }

  if (typeof value.repo !== "string" || !isRepo(value.repo)) {
    issues.push({
      path: "repo",
      message: 'Expected an "owner/name" GitHub repository.',
    });
  }

  if (value.mapping !== undefined && !isOneOf(value.mapping, GISCUS_MAPPINGS)) {
    issues.push({
      path: "mapping",
      message: `Expected one of: ${GISCUS_MAPPINGS.join(", ")}.`,
    });
  }

  if (
    value.inputPosition !== undefined &&
    !isOneOf(value.inputPosition, GISCUS_INPUT_POSITIONS)
  ) {
    issues.push({
      path: "inputPosition",
      message: `Expected one of: ${GISCUS_INPUT_POSITIONS.join(", ")}.`,
    });
  }

  for (const key of ["strict", "reactionsEnabled"] as const) {
    if (value[key] !== undefined && typeof value[key] !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  }

  return issues;
}

function isRepo(value: string): boolean {
  return /^[^\s/]+\/[^\s/]+$/.test(value.trim());
}

function isOneOf<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): value is T {
  return value !== undefined && (allowed as readonly string[]).includes(value);
}

function normalizeNonEmpty(
  value: string | undefined,
  fallback: string,
): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed === "" ? fallback : trimmed;
}
