import {
  type ContentManifest,
  type ContentManifestEntry,
  escapeHtml,
  escapeHtmlAttribute,
} from "@riebeckite/core";
import {
  type DataviewRow,
  evaluateDataviewExpression,
  readDataviewField,
  toDataviewTime,
} from "./evaluate.js";
import type {
  DataviewColumn,
  DataviewExpression,
  DataviewSpec,
  ResolvedDataviewOptions,
} from "./types.js";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const LINK_FIELDS = new Set([
  "file.link",
  "file.permalink",
  "file.url",
  "link",
  "permalink",
  "url",
]);

const TITLE_FIELDS = new Set(["file.name", "file.title", "title", "name"]);

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type DataviewRenderContext = {
  readonly manifest?: ContentManifest;
  readonly buildTime?: Date;
};

export function renderDataview(
  selection: import("./evaluate.js").DataviewSelection,
  spec: DataviewSpec,
  options: ResolvedDataviewOptions,
  source: string,
  context: DataviewRenderContext = {},
): string {
  const className = options.className;
  const body = renderBody(selection, spec, options, context);
  const fallback = renderFallback(source, className, options.hideFallback);
  return `<div class="${escapeHtmlAttribute(className)}" data-dataview data-dataview-type="${spec.type}">${body}${fallback}</div>`;
}

export function renderDataviewError(
  message: string,
  source: string,
  options: ResolvedDataviewOptions,
): string {
  const className = options.className;
  const fallback = renderFallback(source, className, options.hideFallback);
  return `<div class="${escapeHtmlAttribute(className)} ${escapeHtmlAttribute(`${className}--error`)}" data-dataview role="status"><p class="${escapeHtmlAttribute(`${className}__error`)}">${escapeHtml(message)}</p>${fallback}</div>`;
}

function renderBody(
  selection: import("./evaluate.js").DataviewSelection,
  spec: DataviewSpec,
  options: ResolvedDataviewOptions,
  context: DataviewRenderContext,
): string {
  switch (spec.type) {
    case "table":
      return renderTable(selection, spec, options, context);
    case "task":
      return renderTasks(selection, options);
    case "calendar":
      return renderCalendar(selection, spec, options, context);
    default:
      return renderList(selection, spec, options, context);
  }
}

function renderList(
  selection: import("./evaluate.js").DataviewSelection,
  spec: DataviewSpec,
  options: ResolvedDataviewOptions,
  context: DataviewRenderContext,
): string {
  const className = options.className;
  const sections = groupedSections(selection);

  let output = "";
  let total = 0;
  for (const section of sections) {
    if (section.rows.length === 0) continue;
    const items = section.rows
      .map((row) => {
        const meta = spec.listExpression
          ? renderMeta(
              evaluateValue(row, spec.listExpression, context),
              className,
            )
          : "";
        return `<li class="${escapeHtmlAttribute(`${className}__item`)}">${renderEntryLink(row.entry, className)}${meta}</li>`;
      })
      .join("");
    total += section.rows.length;
    output += `${renderGroupHeading(section.key, className)}<ul class="${escapeHtmlAttribute(`${className}__list`)}">${items}</ul>`;
  }

  return total === 0 ? renderEmpty(className) : output;
}

function renderTable(
  selection: import("./evaluate.js").DataviewSelection,
  spec: DataviewSpec,
  options: ResolvedDataviewOptions,
  context: DataviewRenderContext,
): string {
  const className = options.className;
  const columns = spec.columns;
  const showId = spec.withoutId !== true;
  const span = columns.length + (showId ? 1 : 0);
  const sections = groupedSections(selection);

  let rows = "";
  let total = 0;
  for (const section of sections) {
    if (section.rows.length === 0) continue;
    if (section.key !== null) {
      rows += `<tr class="${escapeHtmlAttribute(`${className}__group-row`)}"><th class="${escapeHtmlAttribute(`${className}__group-cell`)}" colspan="${span}">${escapeHtml(section.key)}</th></tr>`;
    }
    for (const row of section.rows) {
      total += 1;
      const cells = columns
        .map(
          (column) =>
            `<td class="${escapeHtmlAttribute(`${className}__cell`)}">${renderColumnValue(row, column, className, context)}</td>`,
        )
        .join("");
      const idCell = showId
        ? `<td class="${escapeHtmlAttribute(`${className}__cell ${className}__cell--id`)}">${renderEntryLink(row.entry, className)}</td>`
        : "";
      rows += `<tr class="${escapeHtmlAttribute(`${className}__row`)}">${idCell}${cells}</tr>`;
    }
  }

  if (total === 0) return renderEmpty(className);

  const head = [
    ...(showId
      ? [
          `<th class="${escapeHtmlAttribute(`${className}__heading`)}" scope="col">File</th>`,
        ]
      : []),
    ...columns.map(
      (column) =>
        `<th class="${escapeHtmlAttribute(`${className}__heading`)}" scope="col">${escapeHtml(columnLabel(column))}</th>`,
    ),
  ].join("");

  return `<table class="${escapeHtmlAttribute(`${className}__table`)}"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

function renderTasks(
  selection: import("./evaluate.js").DataviewSelection,
  options: ResolvedDataviewOptions,
): string {
  const className = options.className;
  const sections = groupedSections(selection);

  let output = "";
  let total = 0;
  for (const section of sections) {
    const items: string[] = [];
    for (const row of section.rows) {
      if (!row.task) continue;
      items.push(renderTaskItem(row, className));
      total += 1;
    }
    if (items.length === 0) continue;
    output += `${renderGroupHeading(section.key, className)}<ul class="${escapeHtmlAttribute(`${className}__tasks`)}">${items.join("")}</ul>`;
  }

  return total === 0 ? renderEmpty(className) : output;
}

function renderCalendar(
  selection: import("./evaluate.js").DataviewSelection,
  spec: DataviewSpec,
  options: ResolvedDataviewOptions,
  context: DataviewRenderContext,
): string {
  const className = options.className;
  const expression: DataviewExpression = spec.calendarExpression ?? {
    kind: "field",
    path: (spec.expression ?? "date").split("."),
  };

  const dated: { row: DataviewRow; time: number }[] = [];
  const seen = new Set<string>();
  for (const row of selection.rows) {
    const time = toDataviewTime(evaluateValue(row, expression, context));
    if (time === null) continue;
    const signature = `${row.entry.slug}:${time}`;
    if (seen.has(signature)) continue;
    seen.add(signature);
    dated.push({ row, time });
  }

  if (dated.length === 0) return renderEmpty(className);

  const latest = Math.max(...dated.map((item) => item.time));
  const base = new Date(latest);
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();

  const byDay = new Map<number, ContentManifestEntry[]>();
  for (const item of dated) {
    const date = new Date(item.time);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month)
      continue;
    const day = date.getUTCDate();
    const bucket = byDay.get(day) ?? [];
    if (!bucket.some((entry) => entry.slug === item.row.entry.slug)) {
      bucket.push(item.row.entry);
    }
    byDay.set(day, bucket);
  }

  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const header = WEEKDAY_NAMES.map(
    (name) =>
      `<th class="${escapeHtmlAttribute(`${className}__calendar-weekday`)}" scope="col">${escapeHtml(name)}</th>`,
  ).join("");

  const cells: string[] = [];
  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push(
      `<td class="${escapeHtmlAttribute(`${className}__calendar-cell ${className}__calendar-cell--empty`)}"></td>`,
    );
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const entries = byDay.get(day) ?? [];
    const links = entries
      .map((entry) => renderEntryLink(entry, className))
      .join(" ");
    cells.push(
      `<td class="${escapeHtmlAttribute(`${className}__calendar-cell`)}"><span class="${escapeHtmlAttribute(`${className}__calendar-day`)}">${day}</span>${links ? `<span class="${escapeHtmlAttribute(`${className}__calendar-links`)}">${links}</span>` : ""}</td>`,
    );
  }
  while (cells.length % 7 !== 0) {
    cells.push(
      `<td class="${escapeHtmlAttribute(`${className}__calendar-cell ${className}__calendar-cell--empty`)}"></td>`,
    );
  }

  const rows: string[] = [];
  for (let index = 0; index < cells.length; index += 7) {
    rows.push(`<tr>${cells.slice(index, index + 7).join("")}</tr>`);
  }

  return `<table class="${escapeHtmlAttribute(`${className}__calendar`)}"><caption class="${escapeHtmlAttribute(`${className}__calendar-caption`)}">${escapeHtml(`${MONTH_NAMES[month]} ${year}`)}</caption><thead><tr>${header}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function groupedSections(
  selection: import("./evaluate.js").DataviewSelection,
): { key: string | null; rows: DataviewRow[] }[] {
  if (selection.grouped) {
    return selection.groups.map((group) => ({
      key: group.key,
      rows: group.rows,
    }));
  }
  return [{ key: null, rows: selection.rows }];
}

function renderGroupHeading(key: string | null, className: string): string {
  if (key === null) return "";
  return `<p class="${escapeHtmlAttribute(`${className}__group`)}">${escapeHtml(key)}</p>`;
}

function renderColumnValue(
  row: DataviewRow,
  column: DataviewColumn,
  className: string,
  context: DataviewRenderContext,
): string {
  const normalized = column.field.trim();
  if (LINK_FIELDS.has(normalized) || TITLE_FIELDS.has(normalized)) {
    return renderEntryLink(row.entry, className);
  }
  if (normalized === "file.tags" || normalized === "tags") {
    return renderTags(row.entry.tags, className);
  }

  const value = column.expression
    ? evaluateValue(row, column.expression, context)
    : readDataviewField(
        row.entry,
        normalized.split("."),
        context.manifest,
        row.fields,
        row.task,
        context.buildTime,
      );
  return escapeHtml(formatValue(value));
}

function renderMeta(value: unknown, className: string): string {
  const rendered = escapeHtml(formatValue(value));
  if (!rendered) return "";
  return ` <span class="${escapeHtmlAttribute(`${className}__meta`)}">${rendered}</span>`;
}

function evaluateValue(
  row: DataviewRow,
  expression: DataviewExpression,
  context: DataviewRenderContext,
): unknown {
  return evaluateDataviewExpression(expression, {
    entry: row.entry,
    manifest: context.manifest as ContentManifest,
    fields: row.fields,
    task: row.task,
    buildTime: context.buildTime,
  });
}

function renderEntryLink(
  entry: ContentManifestEntry,
  className: string,
): string {
  return `<a class="${escapeHtmlAttribute(`${className}__link`)}" href="${escapeHtmlAttribute(entry.permalink)}">${escapeHtml(entry.title)}</a>`;
}

function renderTags(tags: readonly string[], className: string): string {
  return tags
    .map(
      (tag) =>
        `<span class="${escapeHtmlAttribute(`${className}__tag`)}">#${escapeHtml(tag)}</span>`,
    )
    .join(" ");
}

function renderTaskItem(row: DataviewRow, className: string): string {
  const task = row.task;
  if (!task) return "";
  const status = task.checked ? "x" : " ";
  return `<li class="${escapeHtmlAttribute(`${className}__task`)}" data-task="${status}"><span class="${escapeHtmlAttribute(`${className}__task-text`)}">${escapeHtml(task.visual)}</span> <a class="${escapeHtmlAttribute(`${className}__task-link`)}" href="${escapeHtmlAttribute(row.entry.permalink)}">${escapeHtml(row.entry.title)}</a></li>`;
}

function renderFallback(
  source: string,
  className: string,
  hideFallback: boolean,
): string {
  if (hideFallback) return "";
  const trimmed = source.trim();
  if (trimmed.length === 0) return "";
  return `<details class="${escapeHtmlAttribute(`${className}__fallback`)} rb-source-fallback"><summary>Dataview query</summary><pre><code>${escapeHtml(trimmed)}</code></pre></details>`;
}

function renderEmpty(className: string): string {
  return `<p class="${escapeHtmlAttribute(`${className}__empty`)}">No matching content.</p>`;
}

function columnLabel(column: DataviewColumn): string {
  return column.label ?? column.field;
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (value instanceof Date) return formatDate(value);
  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item)).join(", ");
  }
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
