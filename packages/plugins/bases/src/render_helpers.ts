import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import { DEFAULT_COLUMNS } from "./parse.js";
import type { BasesOptions, BasesSpec, BasesView } from "./types.js";

export const TITLE_PROPERTIES = new Set([
  "file.name",
  "file.title",
  "title",
  "name",
]);

export const LINK_PROPERTIES = new Set([
  "file.link",
  "file.permalink",
  "file.url",
  "permalink",
  "url",
]);

export const TAG_PROPERTIES = new Set(["file.tags", "tags"]);

export const BUILTIN_LABELS: Record<string, string> = {
  "file.name": "Name",
  "file.path": "Path",
  "file.slug": "Slug",
  "file.folder": "Folder",
  "file.title": "Title",
  "file.link": "Link",
  "file.permalink": "Permalink",
  "file.tags": "Tags",
};

export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function renderBasesError(
  message: string,
  options: BasesOptions,
): string {
  const className = options.className ?? "rb-bases";
  return `<div class="${escapeHtmlAttribute(className)} ${escapeHtmlAttribute(className)}--error" role="status">${escapeHtml(message)}</div>`;
}

export function selectViews(
  spec: BasesSpec,
  requested: string | undefined,
): BasesView[] {
  const configured = spec.views;
  if (requested && requested.trim() !== "") {
    const target = requested.trim().toLowerCase();
    const matches = configured.filter(
      (view) => view.name?.toLowerCase() === target,
    );
    if (matches.length > 0) return matches;
  }
  if (configured.length > 0) return [...configured];

  const properties = Object.keys(spec.properties);
  return [
    {
      type: "table",
      columns: properties.length > 0 ? properties : [...DEFAULT_COLUMNS],
    },
  ];
}

export function resolveLimit(limit: number | undefined): number {
  if (typeof limit === "number" && Number.isFinite(limit) && limit >= 0) {
    return Math.floor(limit);
  }
  return 100;
}
