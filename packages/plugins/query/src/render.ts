import {
  type ContentManifestEntry,
  escapeHtml,
  escapeHtmlAttribute,
} from "@riebeckite/core";
import type { QueryOptions, QuerySpec } from "./types.js";

export type ResolvedQuery = {
  format: "table" | "list";
  columns: readonly string[];
  empty: string;
  className: string;
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const COLUMN_LABELS: Record<string, string> = {
  title: "Title",
  date: "Date",
  updated: "Updated",
  created: "Created",
  published: "Published",
  tags: "Tags",
  description: "Description",
  permalink: "Permalink",
};

export function resolveQuery(
  spec: QuerySpec,
  options: QueryOptions,
): ResolvedQuery {
  return {
    format: spec.format ?? options.defaultFormat ?? "table",
    columns: spec.columns ?? options.defaultColumns ?? ["title", "date"],
    empty: spec.empty ?? options.emptyMessage ?? "No matching content.",
    className: options.className ?? "rr-query",
  };
}

export function renderQueryResult(
  entries: readonly ContentManifestEntry[],
  query: ResolvedQuery,
): string {
  if (entries.length === 0) {
    return `<p class="${escapeHtmlAttribute(query.className)} ${escapeHtmlAttribute(query.className)}--empty">${escapeHtml(query.empty)}</p>`;
  }
  return query.format === "list"
    ? renderList(entries, query)
    : renderTable(entries, query);
}

export function renderQueryError(
  message: string,
  options: QueryOptions,
): string {
  const className = options.className ?? "rr-query";
  return `<div class="${escapeHtmlAttribute(className)} ${escapeHtmlAttribute(className)}--error" role="status">${escapeHtml(message)}</div>`;
}

function renderTable(
  entries: readonly ContentManifestEntry[],
  query: ResolvedQuery,
): string {
  const { className, columns } = query;
  const head = columns
    .map(
      (field) =>
        `<th class="${escapeHtmlAttribute(className)}__heading" scope="col">${escapeHtml(columnLabel(field))}</th>`,
    )
    .join("");
  const rows = entries
    .map((entry) => {
      const cells = columns
        .map((field) => {
          const modifier = escapeHtmlAttribute(
            `rr-query__cell--${slugify(field)}`,
          );
          return `<td class="${escapeHtmlAttribute(className)}__cell ${modifier}">${renderCell(entry, field, className)}</td>`;
        })
        .join("");
      return `<tr class="${escapeHtmlAttribute(className)}__row">${cells}</tr>`;
    })
    .join("");

  return [
    `<div class="${escapeHtmlAttribute(className)}" data-rr-query-result>`,
    `<table class="${escapeHtmlAttribute(className)}__table">`,
    `<thead><tr>${head}</tr></thead>`,
    `<tbody>${rows}</tbody>`,
    "</table>",
    "</div>",
  ].join("");
}

function renderList(
  entries: readonly ContentManifestEntry[],
  query: ResolvedQuery,
): string {
  const { className, columns } = query;
  const metaColumns = columns.filter((field) => field !== "title");

  const items = entries
    .map((entry) => {
      const meta = metaColumns
        .map((field) => {
          const value = renderCell(entry, field, className);
          if (!value) return "";
          return `<span class="${escapeHtmlAttribute(className)}__meta ${escapeHtmlAttribute(`rr-query__meta--${slugify(field)}`)}">${value}</span>`;
        })
        .join(" ");
      return `<li class="${escapeHtmlAttribute(className)}__item">${renderTitleLink(entry, className)}${meta ? ` ${meta}` : ""}</li>`;
    })
    .join("");

  return [
    `<div class="${escapeHtmlAttribute(className)}" data-rr-query-result>`,
    `<ul class="${escapeHtmlAttribute(className)}__list">${items}</ul>`,
    "</div>",
  ].join("");
}

function renderCell(
  entry: ContentManifestEntry,
  field: string,
  className: string,
): string {
  switch (field) {
    case "title":
      return renderTitleLink(entry, className);
    case "tags":
      return renderTags(entry.tags, className);
    case "permalink":
    case "url":
      return `<a class="${escapeHtmlAttribute(className)}__link" href="${escapeHtmlAttribute(entry.permalink)}">${escapeHtml(entry.permalink)}</a>`;
    default:
      return escapeHtml(formatValue(readFrontmatterField(entry, field)));
  }
}

function renderTitleLink(
  entry: ContentManifestEntry,
  className: string,
): string {
  return `<a class="${escapeHtmlAttribute(className)}__link" href="${escapeHtmlAttribute(entry.permalink)}">${escapeHtml(entry.title)}</a>`;
}

function renderTags(tags: readonly string[], className: string): string {
  return tags
    .map(
      (tag) =>
        `<span class="${escapeHtmlAttribute(className)}__tag">#${escapeHtml(tag)}</span>`,
    )
    .join(" ");
}

function readFrontmatterField(
  entry: ContentManifestEntry,
  field: string,
): unknown {
  if (field === "date") {
    return (
      entry.frontmatter.date ??
      entry.frontmatter.created ??
      entry.frontmatter.published ??
      entry.frontmatter.updated
    );
  }
  return entry.frontmatter[field];
}

function columnLabel(field: string): string {
  return COLUMN_LABELS[field] ?? field;
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

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
