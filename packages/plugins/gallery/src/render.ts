import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import { GALLERY_ATTRIBUTE } from "./placeholder.js";
import type { GalleryItem, GallerySpec } from "./types.js";

/** Root CSS class for the rendered grid. */
export const GALLERY_CLASS = "rr-gallery";

/**
 * Renders a gallery spec as a responsive card grid. Every user-provided value
 * is escaped; the only raw CSS comes from the validated `columns` and `aspect`
 * fields.
 */
export function renderGallery(spec: GallerySpec): string {
  const items = spec.items.map(renderItem).join("");
  const style = [
    `--rr-gallery-columns:${spec.columns}`,
    `--rr-gallery-aspect:${escapeHtmlAttribute(spec.aspect)}`,
  ].join(";");

  return [
    `<div class="${GALLERY_CLASS}" ${GALLERY_ATTRIBUTE} style="${style}">`,
    `<ul class="${GALLERY_CLASS}__items">${items}</ul>`,
    "</div>",
  ].join("");
}

/** Renders a readable replacement for a block that could not be parsed. */
export function renderGalleryError(message: string): string {
  return `<div class="${GALLERY_CLASS} ${GALLERY_CLASS}--error" role="status">${escapeHtml(message)}</div>`;
}

function renderItem(item: GalleryItem): string {
  const image = item.image
    ? `<img class="${GALLERY_CLASS}__image" src="${escapeHtmlAttribute(
        item.image,
      )}" alt="${escapeHtmlAttribute(item.alt ?? item.title ?? "")}" loading="lazy" decoding="async">`
    : "";
  const body = renderBody(item);
  const content = `${image}${body}`;

  const card = item.href
    ? `<a class="${GALLERY_CLASS}__card" href="${escapeHtmlAttribute(item.href)}">${content}</a>`
    : `<div class="${GALLERY_CLASS}__card">${content}</div>`;

  return `<li class="${GALLERY_CLASS}__item">${card}</li>`;
}

function renderBody(item: GalleryItem): string {
  if (!item.title && !item.description && !item.meta) return "";

  const title = item.title
    ? `<span class="${GALLERY_CLASS}__title">${escapeHtml(item.title)}</span>`
    : "";
  const description = item.description
    ? `<span class="${GALLERY_CLASS}__description">${escapeHtml(item.description)}</span>`
    : "";
  const meta = item.meta
    ? `<span class="${GALLERY_CLASS}__meta">${escapeHtml(item.meta)}</span>`
    : "";

  return `<span class="${GALLERY_CLASS}__body">${title}${description}${meta}</span>`;
}
