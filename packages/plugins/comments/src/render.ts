import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import type { Comment, CommentsPage } from "./types.js";

export const COMMENTS_ATTRIBUTE = "data-rr-comments";
export const COMMENTS_ROOT_CLASS = "rr-comments";

export function renderCommentsSection(
  page: CommentsPage,
  headingText: string,
  className: string,
  emptyText: string,
): string {
  const rootClass = className
    ? `${COMMENTS_ROOT_CLASS} ${className}`
    : COMMENTS_ROOT_CLASS;

  const heading = `<h2 class="${COMMENTS_ROOT_CLASS}__heading">${escapeHtml(headingText)}</h2>`;
  const body =
    page.comments.length === 0
      ? `<p class="${COMMENTS_ROOT_CLASS}__empty">${escapeHtml(emptyText)}</p>`
      : `<ol class="${COMMENTS_ROOT_CLASS}__list">${page.comments
          .map((comment) => renderComment(comment))
          .join("")}</ol>`;

  return (
    `<section class="${escapeHtmlAttribute(rootClass)}" ${COMMENTS_ATTRIBUTE} ` +
    `data-content-id="${escapeHtmlAttribute(page.contentId)}" aria-label="${escapeHtmlAttribute(headingText)}">` +
    `${heading}${body}` +
    `</section>`
  );
}

function renderComment(comment: Comment): string {
  const authorName = escapeHtml(comment.author.name);
  const authorLink = comment.author.url
    ? `<a class="${COMMENTS_ROOT_CLASS}__author-link" href="${escapeHtmlAttribute(comment.author.url)}" target="_blank" rel="noopener noreferrer">${authorName}</a>`
    : `<span class="${COMMENTS_ROOT_CLASS}__author-name">${authorName}</span>`;
  const avatar = comment.author.avatarUrl
    ? `<img class="${COMMENTS_ROOT_CLASS}__avatar" src="${escapeHtmlAttribute(comment.author.avatarUrl)}" alt="" loading="lazy" />`
    : "";
  const time = `<time class="${COMMENTS_ROOT_CLASS}__time" datetime="${escapeHtmlAttribute(comment.createdAt)}">${escapeHtml(comment.createdAt)}</time>`;
  const body = comment.url
    ? `<a class="${COMMENTS_ROOT_CLASS}__body-link" href="${escapeHtmlAttribute(comment.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(comment.body)}</a>`
    : `<p class="${COMMENTS_ROOT_CLASS}__body">${escapeHtml(comment.body)}</p>`;

  return (
    `<li class="${COMMENTS_ROOT_CLASS}__item" data-comment-id="${escapeHtmlAttribute(comment.id)}">` +
    `<div class="${COMMENTS_ROOT_CLASS}__meta">${avatar}${authorLink}${time}</div>` +
    body +
    `</li>`
  );
}
