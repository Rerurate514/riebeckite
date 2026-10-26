import {
  type ContentManifestEntry,
  escapeHtml,
  escapeHtmlAttribute,
} from "@riebeckite/core";
import { matchesCondition } from "./evaluate.js";
import { DEFAULT_COLUMNS } from "./parse.js";
import {
  type BasesGroup,
  groupBasesEntries,
  resolveBasesProperty,
  sortBasesEntries,
  summarizeBasesValues,
} from "./transform.js";
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
    .map((view, index) =>
      renderView(view, spec, className, entries, limit, index),
    )
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
  index: number,
): string {
  const pool = entries.filter(
    (entry) =>
      (spec.filter === undefined || matchesCondition(spec.filter, entry)) &&
      (view.filter === undefined || matchesCondition(view.filter, entry)),
  );
  const effectiveLimit = Math.min(view.limit ?? limit, limit);
  const selected = sortBasesEntries(pool, view, spec).slice(0, effectiveLimit);
  const groups = groupBasesEntries(selected, view, spec);

  const name = view.name
    ? `<h3 class="${escapeHtmlAttribute(className)}__view-name">${escapeHtml(view.name)}</h3>`
    : "";
  const count = `<p class="${escapeHtmlAttribute(className)}__count">${selected.length} matching ${selected.length === 1 ? "note" : "notes"}</p>`;
  const body =
    view.type === "cards"
      ? renderCards(view, groups, spec, className, index)
      : renderTable(view, groups, spec, className);

  return `<section class="${escapeHtmlAttribute(className)}__view" data-bases-view="${view.type}" aria-label="${escapeHtmlAttribute(view.name ?? `${view.type} view ${index + 1}`)}">${name}${count}${body}</section>`;
}

function renderTable(
  view: BasesView,
  groups: readonly BasesGroup[],
  spec: BasesSpec,
  className: string,
): string {
  const entries = groups.flatMap((group) => group.entries);
  if (groups.length === 0) return renderEmpty(className);

  const head = view.columns
    .map(
      (property) =>
        `<th class="${escapeHtmlAttribute(className)}__heading" scope="col">${escapeHtml(columnLabel(property, spec))}</th>`,
    )
    .join("");

  const rows = groups
    .map((group) => {
      const heading = view.groupBy
        ? `<tr class="${escapeHtmlAttribute(className)}__group"><th colspan="${view.columns.length}" scope="rowgroup">${escapeHtml(formatValue(group.key) || "No value")} <span class="${escapeHtmlAttribute(className)}__group-count">(${group.entries.length})</span></th></tr>${renderSummaryRow(view, group.entries, spec, className, "group")}`
        : "";
      const values = group.entries
        .map((entry) => {
          const cells = view.columns
            .map(
              (property) =>
                `<td class="${escapeHtmlAttribute(className)}__cell">${renderCell(entry, property, className, spec)}</td>`,
            )
            .join("");
          return `<tr class="${escapeHtmlAttribute(className)}__row">${cells}</tr>`;
        })
        .join("");
      const empty =
        group.entries.length === 0
          ? `<tr class="${escapeHtmlAttribute(className)}__empty-row"><td colspan="${view.columns.length}">${escapeHtml("No matching notes in this group.")}</td></tr>`
          : "";
      return `<tbody>${heading}${values}${empty}</tbody>`;
    })
    .join("");
  const footer = renderSummaryRow(view, entries, spec, className, "overall");

  const table = [
    `<table class="${escapeHtmlAttribute(className)}__table">`,
    `<caption class="${escapeHtmlAttribute(className)}__sr-only">${entries.length} matching ${entries.length === 1 ? "note" : "notes"}</caption>`,
    `<thead><tr>${head}</tr></thead>`,
    rows,
    footer ? `<tfoot>${footer}</tfoot>` : "",
    "</table>",
  ].join("");
  return `<div class="${escapeHtmlAttribute(className)}__table-scroll" role="region" aria-label="${escapeHtmlAttribute(view.name ?? "Table view")}" tabindex="0">${table}</div>`;
}

function renderCards(
  view: BasesView,
  groups: readonly BasesGroup[],
  spec: BasesSpec,
  className: string,
  viewIndex: number,
): string {
  if (groups.length === 0) return renderEmpty(className);

  const titleProperty = view.columns.find((property) =>
    TITLE_PROPERTIES.has(property.toLowerCase()),
  );
  const fields = view.columns.filter((property) => property !== titleProperty);

  const cards = groups
    .map((group, index) => {
      const groupId = `rb-bases-group-${viewIndex}-${index}`;
      const heading = view.groupBy
        ? `<h4 class="${escapeHtmlAttribute(className)}__group-title" id="${escapeHtmlAttribute(groupId)}">${escapeHtml(formatValue(group.key) || "No value")} <span class="${escapeHtmlAttribute(className)}__group-count">(${group.entries.length})</span></h4>`
        : "";
      const items = group.entries
        .map((entry) => {
          const title = `<a class="${escapeHtmlAttribute(className)}__link" href="${escapeHtmlAttribute(entry.permalink)}">${escapeHtml(entry.title)}</a>`;
          const fieldHtml = fields
            .map((property) => {
              const label = escapeHtml(columnLabel(property, spec));
              const value = renderCell(entry, property, className, spec);
              return `<div class="${escapeHtmlAttribute(className)}__field"><dt class="${escapeHtmlAttribute(className)}__field-label">${label}</dt><dd class="${escapeHtmlAttribute(className)}__field-value">${value}</dd></div>`;
            })
            .join("");
          const fieldsBlock = fieldHtml
            ? `<dl class="${escapeHtmlAttribute(className)}__fields">${fieldHtml}</dl>`
            : "";
          return `<li class="${escapeHtmlAttribute(className)}__card"><div class="${escapeHtmlAttribute(className)}__card-title">${title}</div>${fieldsBlock}</li>`;
        })
        .join("");
      const empty =
        group.entries.length === 0
          ? `<li class="${escapeHtmlAttribute(className)}__card-empty">No matching notes in this group.</li>`
          : "";
      const labelledBy = view.groupBy
        ? ` aria-labelledby="${escapeHtmlAttribute(groupId)}"`
        : ' aria-label="Cards"';
      return `<section class="${escapeHtmlAttribute(className)}__card-group">${heading}<ul class="${escapeHtmlAttribute(className)}__cards"${labelledBy}>${items}${empty}</ul></section>`;
    })
    .join("");

  return cards;
}

function renderEmpty(className: string): string {
  return `<p class="${escapeHtmlAttribute(className)}__empty">No matching notes.</p>`;
}

function renderFallback(className: string, source: string): string {
  return `<details class="${escapeHtmlAttribute(className)}__fallback rb-source-fallback"><summary>Base definition</summary><pre><code>${escapeHtml(source)}</code></pre></details>`;
}

function renderCell(
  entry: ContentManifestEntry,
  property: string,
  className: string,
  spec: BasesSpec,
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

  const value = resolveBasesProperty(entry, property, spec);
  return escapeHtml(formatValue(value));
}

function renderSummaryRow(
  view: BasesView,
  entries: readonly ContentManifestEntry[],
  spec: BasesSpec,
  className: string,
  kind: "group" | "overall",
): string {
  if (!view.summaries) return "";
  const cells = view.columns
    .map((property) => {
      const summary = view.summaries?.[property];
      if (!summary)
        return `<td class="${escapeHtmlAttribute(className)}__summary"></td>`;
      const values = entries.map((entry) =>
        resolveBasesProperty(entry, property, spec),
      );
      return `<td class="${escapeHtmlAttribute(className)}__summary">${escapeHtml(formatValue(summarizeBasesValues(values, summary, spec)))}<span class="${escapeHtmlAttribute(className)}__sr-only"> ${escapeHtml(`${columnLabel(property, spec)} summary`)}</span></td>`;
    })
    .join("");
  return `<tr class="${escapeHtmlAttribute(className)}__summary-row ${escapeHtmlAttribute(className)}__summary-row--${kind}">${cells}</tr>`;
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
