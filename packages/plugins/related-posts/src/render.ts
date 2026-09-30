import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import type {
  RelatedPostsEntry,
  ResolvedRelatedPostsOptions,
} from "./types.js";

/** Boolean attribute that marks the generated navigation for tests and styling. */
export const RELATED_POSTS_ATTRIBUTE = "data-related-posts";

/**
 * Renders the related-posts navigation. Returns an empty string when there is
 * nothing to show, so callers can leave an entry's HTML untouched.
 */
export function renderRelatedPosts(
  entries: readonly RelatedPostsEntry[],
  options: ResolvedRelatedPostsOptions,
): string {
  if (entries.length === 0) return "";

  const className = escapeHtmlAttribute(options.className);
  const heading = options.heading
    ? `<h2 class="${className}__heading">${escapeHtml(options.headingText)}</h2>`
    : "";
  const items = entries
    .map(
      (entry) =>
        `<li class="${className}__item"><a class="${className}__link" href="${escapeHtmlAttribute(
          entry.permalink,
        )}" data-related-score="${entry.score}">${escapeHtml(entry.title)}</a></li>`,
    )
    .join("");

  return `<nav class="${className}" ${RELATED_POSTS_ATTRIBUTE}>${heading}<ul>${items}</ul></nav>`;
}
