import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import type { BibliographyEntry } from "./types.js";

type RenderBibliographyInput = {
  readonly title: string;
  readonly entries: readonly (readonly [string, BibliographyEntry])[];
};

export function renderBibliographyPage(input: RenderBibliographyInput): string {
  const items = input.entries
    .map(([key, entry]) => renderItem(key, entry))
    .join("");
  return `<main class="rb-citations-page"><h1 class="rb-citations-page__title">${escapeHtml(
    input.title,
  )}</h1><ol class="rb-citations-page__list">${items}</ol></main>`;
}

function renderItem(key: string, entry: BibliographyEntry): string {
  const fields = entry.fields;
  const author = fields.author ?? fields.editor;
  const year = fields.year ?? fields.date;
  const container = fields.journal ?? fields.booktitle ?? fields.publisher;

  const parts: string[] = [];
  if (author)
    parts.push(
      `<span class="rb-citations-page__author">${escapeHtml(author)}</span>`,
    );
  if (year)
    parts.push(
      `<span class="rb-citations-page__year">${escapeHtml(year)}</span>`,
    );
  if (fields.title)
    parts.push(
      `<span class="rb-citations-page__work">${escapeHtml(fields.title)}</span>`,
    );
  if (container)
    parts.push(
      `<span class="rb-citations-page__container">${escapeHtml(container)}</span>`,
    );
  if (parts.length === 0)
    parts.push(
      `<span class="rb-citations-page__key">${escapeHtml(key)}</span>`,
    );

  const id = escapeHtmlAttribute(referenceId(key));
  return `<li class="rb-citations-page__item" id="${id}">${parts.join(
    " ",
  )}${renderLink(fields)}</li>`;
}

function renderLink(fields: Readonly<Record<string, string>>): string {
  const href = safeExternalUrl(fields.url) ?? safeDoiUrl(fields.doi);
  if (!href) return "";
  return ` <a class="rb-citations-page__link" href="${escapeHtmlAttribute(
    href,
  )}" rel="noopener noreferrer">${escapeHtml(href)}</a>`;
}

function safeExternalUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function safeDoiUrl(value: string | undefined): string | null {
  if (!value) return null;
  const doi = value
    .trim()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "");
  if (!/^10\.\d{4,9}\//.test(doi)) return null;
  return `https://doi.org/${encodeURI(doi)}`;
}

function referenceId(key: string): string {
  const sanitized = key
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `ref-${sanitized || "key"}`;
}
