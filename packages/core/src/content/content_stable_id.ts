import type { PostFrontmatter } from "../types/post_content.js";

const MAX_STABLE_CONTENT_ID_LENGTH = 160;

/**
 * Reads the optional, source-authored stable content ID from frontmatter.
 */
export function resolveContentStableId(
  frontmatter: PostFrontmatter,
): string | undefined {
  return readOptionalStableId(frontmatter.id);
}

function readOptionalStableId(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new Error(`Content frontmatter field "id" must be a string.`);
  }
  if (
    value.length === 0 ||
    value.length > MAX_STABLE_CONTENT_ID_LENGTH ||
    value.trim() !== value ||
    [...value].some((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code <= 31 || code === 127;
    })
  ) {
    throw new Error(
      `Content frontmatter field "id" must be a non-empty, trimmed string of at most ${MAX_STABLE_CONTENT_ID_LENGTH} characters without control characters.`,
    );
  }
  return value;
}
