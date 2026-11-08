import type { ConfigValidationIssue } from "@riebeckite/core";
import { MemoryCommentsProvider } from "./provider.js";
import type {
  CommentsOptions,
  CommentsProvider,
  ResolvedCommentsOptions,
} from "./types.js";

export const DEFAULT_COMMENTS_HEADING_TEXT = "Comments";
export const DEFAULT_COMMENTS_CLASS_NAME = "rr-comments";
export const DEFAULT_COMMENTS_LIMIT = 20;
export const DEFAULT_COMMENTS_EMPTY_TEXT = "No comments yet.";

export function resolveCommentsOptions(
  options: CommentsOptions = {},
): ResolvedCommentsOptions {
  return {
    provider: options.provider ?? new MemoryCommentsProvider(),
    headingText: normalizeNonEmpty(
      options.headingText,
      DEFAULT_COMMENTS_HEADING_TEXT,
    ),
    className: normalizeNonEmpty(options.className, DEFAULT_COMMENTS_CLASS_NAME),
    limit: normalizeLimit(options.limit),
    emptyText: normalizeNonEmpty(
      options.emptyText,
      DEFAULT_COMMENTS_EMPTY_TEXT,
    ),
  };
}

export function validateCommentsOptions(
  options: CommentsOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];
  const issues: ConfigValidationIssue[] = [];

  if (options.provider !== undefined && !isCommentsProvider(options.provider)) {
    issues.push({
      path: "provider",
      message: "Expected a comments provider with capabilities and getComments.",
    });
  }

  for (const key of ["headingText", "className", "emptyText"] as const) {
    const value = options[key];
    if (value !== undefined && (typeof value !== "string" || value.trim() === "")) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  }

  if (options.limit !== undefined && !isNonNegativeInteger(options.limit)) {
    issues.push({
      path: "limit",
      message: "Expected a non-negative integer.",
    });
  }

  return issues;
}

function isCommentsProvider(value: unknown): value is CommentsProvider {
  if (!value || typeof value !== "object") return false;
  const provider = value as Record<string, unknown>;
  return (
    provider.capabilities instanceof Set &&
    typeof provider.getComments === "function"
  );
}

function normalizeLimit(limit: number | undefined): number {
  if (typeof limit !== "number" || !isNonNegativeInteger(limit)) {
    return DEFAULT_COMMENTS_LIMIT;
  }
  return limit;
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function normalizeNonEmpty(value: string | undefined, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed === "" ? fallback : trimmed;
}
