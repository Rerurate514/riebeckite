import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import type { WebmentionMention } from "./mention.js";
import type { ResolvedWebmentionOptions } from "./types.js";

/** Boolean attribute that marks the generated mention section. */
export const WEBMENTION_ATTRIBUTE = "data-webmention";

/**
 * Renders the mentions section with stable `rr-webmention` hooks. Returns an
 * empty string when there is nothing to show so callers can leave an entry's
 * HTML untouched.
 */
export function renderWebmentionSection(
  mentions: readonly WebmentionMention[],
  options: ResolvedWebmentionOptions,
): string {
  if (mentions.length === 0) return "";

  const className = escapeHtmlAttribute(options.className);
  const items = mentions
    .map((mention) => renderWebmentionItem(mention, options))
    .join("");

  return (
    `<section class="${className}" ${WEBMENTION_ATTRIBUTE}` +
    ` data-webmention-count="${mentions.length}">` +
    `<h2 class="${className}__heading">${escapeHtml(options.headingText)}</h2>` +
    `<ul class="${className}__list">${items}</ul>` +
    "</section>"
  );
}

/** Renders one mention list item. */
export function renderWebmentionItem(
  mention: WebmentionMention,
  options: ResolvedWebmentionOptions,
): string {
  const className = escapeHtmlAttribute(options.className);
  const rel = options.nofollow ? ' rel="nofollow ugc"' : "";
  const label =
    firstNonEmpty(mention.title, mention.author?.name) ?? mention.source;
  const author =
    mention.author?.name !== undefined && mention.title !== undefined
      ? `<span class="${className}__author">${escapeHtml(mention.author.name)}</span>`
      : "";
  const date =
    mention.publishedAt === undefined
      ? ""
      : `<time class="${className}__date" datetime="${escapeHtmlAttribute(
          mention.publishedAt,
        )}">${escapeHtml(formatDate(mention.publishedAt))}</time>`;
  const excerpt =
    mention.excerpt === undefined
      ? ""
      : `<p class="${className}__excerpt">${escapeHtml(mention.excerpt)}</p>`;

  return (
    `<li class="${className}__item ${className}__item--${mention.type}"` +
    ` data-webmention-type="${mention.type}">` +
    `<a class="${className}__source" href="${escapeHtmlAttribute(
      mention.source,
    )}"${rel}>${escapeHtml(label)}</a>` +
    `${author}${date}${excerpt}` +
    "</li>"
  );
}

function firstNonEmpty(
  ...values: readonly (string | undefined)[]
): string | undefined {
  for (const value of values) {
    if (value !== undefined && value.trim() !== "") return value;
  }
  return undefined;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}
