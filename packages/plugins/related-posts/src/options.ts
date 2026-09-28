import type {
  RelatedPostsOptions,
  ResolvedRelatedPostsOptions,
} from "./types.js";

export const DEFAULT_RELATED_POSTS_LIMIT = 5;
export const DEFAULT_RELATED_POSTS_MIN_SCORE = 1;
export const DEFAULT_RELATED_POSTS_HEADING_TEXT = "Related";
export const DEFAULT_RELATED_POSTS_CLASS_NAME = "rb-related-posts";

/**
 * Applies defaults to `RelatedPostsOptions`. Pure and deterministic so the
 * plugin can resolve options once and reuse them for every manifest entry.
 */
export function resolveRelatedPostsOptions(
  options: RelatedPostsOptions = {},
): ResolvedRelatedPostsOptions {
  return {
    limit: options.limit ?? DEFAULT_RELATED_POSTS_LIMIT,
    minScore: options.minScore ?? DEFAULT_RELATED_POSTS_MIN_SCORE,
    heading: options.heading ?? true,
    headingText: options.headingText ?? DEFAULT_RELATED_POSTS_HEADING_TEXT,
    className: normalizeClassName(options.className),
    useTags: options.useTags ?? true,
    useBacklinks: options.useBacklinks ?? true,
  };
}

function normalizeClassName(className: string | undefined): string {
  if (typeof className !== "string") return DEFAULT_RELATED_POSTS_CLASS_NAME;
  const trimmed = className.trim();
  return trimmed === "" ? DEFAULT_RELATED_POSTS_CLASS_NAME : trimmed;
}
