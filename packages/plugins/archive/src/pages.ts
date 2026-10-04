import {
  type ContentCollection,
  escapeHtml,
  escapeHtmlAttribute,
} from "@riebeckite/core";
import { archivePaginationLabels } from "./locale.js";
import type { ArchivePage, ResolvedArchiveOptions } from "./types.js";

export function renderArchivePage(
  collection: ContentCollection,
  options: ResolvedArchiveOptions,
  locale: string,
): ArchivePage {
  const className = escapeHtmlAttribute(options.className);
  const posts = collection.entries
    .map(
      (entry) =>
        `<li class="${className}__item"><a class="${className}__link" href="${escapeHtmlAttribute(
          entry.permalink,
        )}">${escapeHtml(entry.title)}</a></li>`,
    )
    .join("");

  const labels = archivePaginationLabels(locale);
  const navigation: string[] = [];
  if (collection.page.previousPath) {
    navigation.push(
      `<a class="${className}__link" rel="prev" href="${escapeHtmlAttribute(
        collection.page.previousPath,
      )}">${escapeHtml(labels.previous)}</a>`,
    );
  }
  if (collection.page.nextPath) {
    navigation.push(
      `<a class="${className}__link" rel="next" href="${escapeHtmlAttribute(
        collection.page.nextPath,
      )}">${escapeHtml(labels.next)}</a>`,
    );
  }
  const pagination =
    navigation.length > 0
      ? `<nav class="${className}__pagination">${navigation.join(" ")}</nav>`
      : "";

  const html = `<section class="${className}" data-rr-archive="${escapeHtmlAttribute(
    collection.value,
  )}"><h1 class="${className}__title">${escapeHtml(
    collection.title,
  )}</h1><ul class="${className}__list">${posts}</ul>${pagination}</section>`;

  return { title: collection.title, html };
}
