import type { ContentIcon } from "@riebeckite/core";
import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import type { FolderPage, ResolvedFolderPagesOptions } from "./types.js";

export function renderFolderPage(
  page: FolderPage,
  options: ResolvedFolderPagesOptions,
): { title: string; html: string } {
  const className = escapeHtmlAttribute(options.className);
  const parts: string[] = [
    `<section class="${className}" data-rr-folder-page="${escapeHtmlAttribute(page.folder)}">`,
    `<h1 class="${className}__title">${renderIcon(page.icon)}${escapeHtml(page.title)}</h1>`,
  ];
  if (page.pages.length > 0) {
    parts.push(
      `<h2 class="${className}__heading">${escapeHtml(options.pagesLabel)}</h2>`,
      `<ul class="${className}__pages">`,
    );
    for (const link of page.pages)
      parts.push(renderLink(className, link, options));
    parts.push("</ul>");
  }
  if (page.folders.length > 0) {
    parts.push(
      `<h2 class="${className}__heading">${escapeHtml(options.foldersLabel)}</h2>`,
      `<ul class="${className}__folders">`,
    );
    for (const link of page.folders)
      parts.push(renderLink(className, link, options));
    parts.push("</ul>");
  }
  parts.push("</section>");
  return { title: page.title, html: parts.join("") };
}

function renderLink(
  className: string,
  link: {
    title: string;
    permalink: string;
    icon?: ContentIcon;
    date?: string;
    tags?: readonly string[];
  },
  options: Pick<ResolvedFolderPagesOptions, "showDate" | "showTags">,
): string {
  return `<li class="${className}__item"><a class="${className}__link" href="${escapeHtmlAttribute(link.permalink)}"><span class="${className}__link-title">${renderIcon(link.icon)}${escapeHtml(link.title)}</span>${renderMetadata(className, link, options)}</a></li>`;
}

function renderMetadata(
  className: string,
  link: { date?: string; tags?: readonly string[] },
  options: Pick<ResolvedFolderPagesOptions, "showDate" | "showTags">,
): string {
  const parts: string[] = [];
  if (options.showDate && link.date) {
    parts.push(
      `<time class="${className}__date" datetime="${escapeHtmlAttribute(link.date)}">${escapeHtml(link.date)}</time>`,
    );
  }
  if (options.showTags && link.tags && link.tags.length > 0) {
    parts.push(
      `<span class="${className}__tags">${link.tags.map((tag) => `<span class="${className}__tag">#${escapeHtml(tag)}</span>`).join("")}</span>`,
    );
  }
  return parts.length > 0
    ? `<span class="${className}__meta">${parts.join("")}</span>`
    : "";
}

function renderIcon(icon: ContentIcon | undefined): string {
  return icon ? `<span class="rr-folder-page__icon">${icon.html}</span>` : "";
}
