import type { ConfigValidationIssue } from "@riebeckite/core";
import type { CommentsOptions, ResolvedCommentsOptions } from "./types.js";

export const DEFAULT_COMMENTS_CLASS_NAME = "rr-comments";

export function resolveCommentsOptions(
  options: CommentsOptions,
): ResolvedCommentsOptions {
  return {
    className: normalizeNonEmpty(
      options.className,
      DEFAULT_COMMENTS_CLASS_NAME,
    ),
  };
}

export function validateCommentsOptions(
  options: CommentsOptions | undefined,
): readonly ConfigValidationIssue[] {
  const value = options ?? ({} as CommentsOptions);
  const issues: ConfigValidationIssue[] = [
    ...(value.provider?.validateOptions?.() ?? []),
  ];

  if (!value.provider || typeof value.provider !== "object") {
    issues.push({ path: "provider", message: "Expected a comments provider." });
  }

  if (
    value.className !== undefined &&
    (typeof value.className !== "string" || value.className.trim() === "")
  ) {
    issues.push({ path: "className", message: "Expected a non-empty string." });
  }

  return issues;
}

function normalizeNonEmpty(
  value: string | undefined,
  fallback: string,
): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed === "" ? fallback : trimmed;
}
