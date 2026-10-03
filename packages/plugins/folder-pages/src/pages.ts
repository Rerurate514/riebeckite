import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import type { FolderPage, ResolvedFolderPagesOptions } from "./types.js";

export function renderFolderPage(
  page: FolderPage,
  options: ResolvedFolderPagesOptions,
): { title: string; html: string } {
  const className = escapeHtmlAttribute(options.className);
  const parts: string[] = [
    `<section class="${className}" data-rr-folder-page="${escapeHtmlAttribute(page.folder)}">`,
    `<h1 class="${className}__title">${escapeHtml(page.title)}</h1>`,
  ];
  if (page.pages.length > 0) {
    parts.push(
      `<h2 class="${className}__heading">${escapeHtml(options.pagesLabel)}</h2>`,
      `<ul class="${className}__pages">`,
    );
    for (const link of page.pages) parts.push(renderLink(className, link));
    parts.push("</ul>");
  }
  if (page.folders.length > 0) {
    parts.push(
      `<h2 class="${className}__heading">${escapeHtml(options.foldersLabel)}</h2>`,
      `<ul class="${className}__folders">`,
    );
    for (const link of page.folders) parts.push(renderLink(className, link));
    parts.push("</ul>");
  }
  parts.push("</section>");
  return { title: page.title, html: parts.join("") };
}

function renderLink(
  className: string,
  link: { title: string; permalink: string },
): string {
  return `<li class="${className}__item"><a class="${className}__link" href="${escapeHtmlAttribute(link.permalink)}">${escapeHtml(link.title)}</a></li>`;
}
