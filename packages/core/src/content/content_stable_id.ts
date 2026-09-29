import type { PostFrontmatter } from "../types/post_content.js";

const MAX_STABLE_CONTENT_ID_LENGTH = 160;

/**
 * Reads the optional, source-authored stable content ID.
 *
 * `id` is the canonical frontmatter field. `uid` is accepted only for
 * compatibility with existing content that used it before `id` was standard.
 */
export function resolveContentStableId(
  frontmatter: PostFrontmatter,
): string | undefined {
  const id = readOptionalStableId(frontmatter.id, "id");
  const uid = readOptionalStableId(frontmatter.uid, "uid");

  if (id !== undefined && uid !== undefined && id !== uid) {
    throw new Error(
      'Content frontmatter fields "id" and "uid" must have the same value.',
    );
  }

  return id ?? uid;
}

function readOptionalStableId(
  value: unknown,
  field: "id" | "uid",
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new Error(`Content frontmatter field "${field}" must be a string.`);
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
      `Content frontmatter field "${field}" must be a non-empty, trimmed string of at most ${MAX_STABLE_CONTENT_ID_LENGTH} characters without control characters.`,
    );
  }
  return value;
}
