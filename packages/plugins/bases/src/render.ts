import {
  type ContentManifestEntry,
  escapeHtml,
  escapeHtmlAttribute,
  queryContentEntries,
} from "@riebeckite/core";
import { matchesCondition, resolveValueRef } from "./evaluate.js";
import { DEFAULT_COLUMNS, parseValueRef } from "./parse.js";
import type { BasesOptions, BasesSpec, BasesView } from "./types.js";

const TITLE_PROPERTIES = new Set(["file.name", "file.title", "title", "name"]);
const LINK_PROPERTIES = new Set([
  "file.link",
  "file.permalink",
  "file.url",
  "permalink",
  "url",
]);
const TAG_PROPERTIES = new Set(["file.tags", "tags"]);

const BUILTIN_LABELS: Record<string, string> = {
  "file.name": "Name",
  "file.path": "Path",
  "file.slug": "Slug",
  "file.folder": "Folder",
  "file.title": "Title",
  "file.link": "Link",
  "file.permalink": "Permalink",
  "file.tags": "Tags",
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Renders a compiled Base definition to HTML. */
export function renderBases(
  spec: BasesSpec,
  options: BasesOptions,
  entries: readonly ContentManifestEntry[],
  source: string,
): string {
  const className = options.className ?? "rb-bases";
  const views = selectViews(spec, options.view);
  const limit = resolveLimit(options.limit);
  const sections = views
    .map((view) => renderView(view, spec, className, entries, limit))
    .join("");
  const fallback =
    options.showFallback === false ? "" : renderFallback(className, source);
  const firstType = views[0]?.type ?? "table";

  return `<div class="${escapeHtmlAttribute(className)}" data-bases data-bases-view="${firstType}">${sections}${fallback}</div>`;
}

/** Renders an inline error when a placeholder cannot be resolved. */
export function renderBasesError(
  message: string,
  options: BasesOptions,
): string {
  const className = options.className ?? "rb-bases";
  return `<div class="${escapeHtmlAttribute(className)} ${escapeHtmlAttribute(className)}--error" role="status">${escapeHtml(message)}</div>`;
}

function selectViews(
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

function resolveLimit(limit: number | undefined): number {
  if (typeof limit === "number" && Number.isFinite(limit) && limit >= 0) {
    return Math.floor(limit);
  }
  return 100;
}

function renderView(
  view: BasesView,
  spec: BasesSpec,
  className: string,
  entries: readonly ContentManifestEntry[],
  limit: number,
): string {
  const pool = entries.filter(
    (entry) =>
      view.filter === undefined || matchesCondition(view.filter, entry),
  );
  const effectiveLimit = Math.min(view.limit ?? limit, limit);
  const selected = queryContentEntries(pool, {
    ...(view.sort === undefined ? {} : { sort: view.sort }),
    limit: effectiveLimit,
  });

  const name = view.name
    ? `<h3 class="${escapeHtmlAttribute(className)}__view-name">${escapeHtml(view.name)}</h3>`
    : "";
  const body =
    view.type === "cards"
      ? renderCards(view, selected, spec, className)
      : renderTable(view, selected, spec, className);

  return `<section class="${escapeHtmlAttribute(className)}__view" data-bases-view="${view.type}">${name}${body}</section>`;
}

function renderTable(
  view: BasesView,
  entries: readonly ContentManifestEntry[],
  spec: BasesSpec,
  className: string,
): string {
  if (entries.length === 0) return renderEmpty(className);

  const head = view.columns
    .map(
      (property) =>
        `<th class="${escapeHtmlAttribute(className)}__heading" scope="col">${escapeHtml(columnLabel(property, spec))}</th>`,
    )
    .join("");

  const rows = entries
    .map((entry) => {
      const cells = view.columns
        .map(
          (property) =>
            `<td class="${escapeHtmlAttribute(className)}__cell">${renderCell(entry, property, className)}</td>`,
        )
        .join("");
      return `<tr class="${escapeHtmlAttribute(className)}__row">${cells}</tr>`;
    })
    .join("");

  return [
    `<table class="${escapeHtmlAttribute(className)}__table">`,
    `<thead><tr>${head}</tr></thead>`,
    `<tbody>${rows}</tbody>`,
    "</table>",
  ].join("");
}

function renderCards(
  view: BasesView,
  entries: readonly ContentManifestEntry[],
  spec: BasesSpec,
  className: string,
): string {
  if (entries.length === 0) return renderEmpty(className);

  const titleProperty = view.columns.find((property) =>
    TITLE_PROPERTIES.has(property.toLowerCase()),
  );
  const fields = view.columns.filter((property) => property !== titleProperty);

  const items = entries
    .map((entry) => {
      const title = `<a class="${escapeHtmlAttribute(className)}__link" href="${escapeHtmlAttribute(entry.permalink)}">${escapeHtml(entry.title)}</a>`;
      const fieldHtml = fields
        .map((property) => {
          const label = escapeHtml(columnLabel(property, spec));
          const value = renderCell(entry, property, className);
          return `<div class="${escapeHtmlAttribute(className)}__field"><dt class="${escapeHtmlAttribute(className)}__field-label">${label}</dt><dd class="${escapeHtmlAttribute(className)}__field-value">${value}</dd></div>`;
        })
        .join("");
      const fieldsBlock = fieldHtml
        ? `<dl class="${escapeHtmlAttribute(className)}__fields">${fieldHtml}</dl>`
        : "";
      return `<li class="${escapeHtmlAttribute(className)}__card"><div class="${escapeHtmlAttribute(className)}__card-title">${title}</div>${fieldsBlock}</li>`;
    })
    .join("");

  return `<ul class="${escapeHtmlAttribute(className)}__cards">${items}</ul>`;
}

function renderEmpty(className: string): string {
  return `<p class="${escapeHtmlAttribute(className)}__empty">No matching notes.</p>`;
}

function renderFallback(className: string, source: string): string {
  return `<details class="${escapeHtmlAttribute(className)}__fallback"><summary>Base definition</summary><pre><code>${escapeHtml(source)}</code></pre></details>`;
}

function renderCell(
  entry: ContentManifestEntry,
  property: string,
  className: string,
): string {
  const key = property.toLowerCase();

  if (TITLE_PROPERTIES.has(key)) {
    return `<a class="${escapeHtmlAttribute(className)}__link" href="${escapeHtmlAttribute(entry.permalink)}">${escapeHtml(entry.title)}</a>`;
  }
  if (LINK_PROPERTIES.has(key)) {
    return `<a class="${escapeHtmlAttribute(className)}__link" href="${escapeHtmlAttribute(entry.permalink)}">${escapeHtml(entry.permalink)}</a>`;
  }
  if (TAG_PROPERTIES.has(key)) {
    return entry.tags.length === 0
      ? ""
      : `<span class="${escapeHtmlAttribute(className)}__tags">${entry.tags
          .map(
            (tag) =>
              `<span class="${escapeHtmlAttribute(className)}__tag">#${escapeHtml(tag)}</span>`,
          )
          .join(" ")}</span>`;
  }

  const value = resolveValueRef(parseValueRef(property), entry);
  return escapeHtml(formatValue(value));
}

function columnLabel(property: string, spec: BasesSpec): string {
  const configured = spec.properties[property];
  if (configured && configured !== "") return configured;

  const key = property.toLowerCase();
  const builtin = BUILTIN_LABELS[key];
  if (builtin) return builtin;

  const normalized = property
    .replace(/^note\./i, "")
    .replace(/^file\.frontmatter\./i, "");
  return normalized;
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (value instanceof Date) return formatDate(value);
  if (Array.isArray(value))
    return value.map((item) => formatValue(item)).join(", ");
  if (typeof value === "string") {
    return DATE_ONLY.test(value.trim()) ? value.trim() : value;
  }
  return String(value);
}

function formatDate(value: Date): string {
  const time = value.getTime();
  if (!Number.isFinite(time)) return "";
  return value.toISOString().slice(0, 10);
}
