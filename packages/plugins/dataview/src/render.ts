import {
  type ContentManifestEntry,
  escapeHtml,
  escapeHtmlAttribute,
} from "@riebeckite/core";
import {
  type DataviewGroup,
  type DataviewSelection,
  readDataviewField,
  toDataviewTime,
} from "./evaluate.js";
import type {
  DataviewColumn,
  DataviewSpec,
  ResolvedDataviewOptions,
} from "./types.js";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const TASK_ITEM_PATTERN =
  /<li class="task-list-item">\s*(?:<p>)?<input type="checkbox"([^>]*)>([\s\S]*?)(?:<\/p>)?\s*<\/li>/g;

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

export function renderDataview(
  selection: DataviewSelection,
  spec: DataviewSpec,
  options: ResolvedDataviewOptions,
  source: string,
): string {
  const className = options.className;
  const body = renderBody(selection, spec, options);
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
  selection: DataviewSelection,
  spec: DataviewSpec,
  options: ResolvedDataviewOptions,
): string {
  switch (spec.type) {
    case "table":
      return renderTable(selection, spec, options);
    case "task":
      return renderTasks(selection, options);
    case "calendar":
      return renderCalendar(selection, spec, options);
    default:
      return renderList(selection, spec, options);
  }
}

function renderList(
  selection: DataviewSelection,
  spec: DataviewSpec,
  options: ResolvedDataviewOptions,
): string {
  const className = options.className;
  const sections = groupedSections(selection);

  let output = "";
  let total = 0;
  for (const section of sections) {
    if (section.entries.length === 0) continue;
    const items = section.entries
      .map((entry) => {
        const meta = spec.expression
          ? renderMeta(entry, spec.expression, className)
          : "";
        return `<li class="${escapeHtmlAttribute(`${className}__item`)}">${renderEntryLink(entry, className)}${meta}</li>`;
      })
      .join("");
    total += section.entries.length;
    output += `${renderGroupHeading(section.key, className)}<ul class="${escapeHtmlAttribute(`${className}__list`)}">${items}</ul>`;
  }

  return total === 0 ? renderEmpty(className) : output;
}

function renderTable(
  selection: DataviewSelection,
  spec: DataviewSpec,
  options: ResolvedDataviewOptions,
): string {
  const className = options.className;
  const columns =
    spec.columns.length > 0 ? spec.columns : [{ field: "file.link" }];
  const sections = groupedSections(selection);

  let rows = "";
  let total = 0;
  for (const section of sections) {
    if (section.entries.length === 0) continue;
    if (section.key !== null) {
      rows += `<tr class="${escapeHtmlAttribute(`${className}__group-row`)}"><th class="${escapeHtmlAttribute(`${className}__group-cell`)}" colspan="${columns.length}">${escapeHtml(section.key)}</th></tr>`;
    }
    for (const entry of section.entries) {
      total += 1;
      const cells = columns
        .map(
          (column) =>
            `<td class="${escapeHtmlAttribute(`${className}__cell`)}">${renderColumnValue(entry, column, className)}</td>`,
        )
        .join("");
      rows += `<tr class="${escapeHtmlAttribute(`${className}__row`)}">${cells}</tr>`;
    }
  }

  if (total === 0) return renderEmpty(className);

  const head = columns
    .map(
      (column) =>
        `<th class="${escapeHtmlAttribute(`${className}__heading`)}" scope="col">${escapeHtml(columnLabel(column))}</th>`,
    )
    .join("");

  return `<table class="${escapeHtmlAttribute(`${className}__table`)}"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

type ExtractedTask = {
  checked: boolean;
  text: string;
};

function renderTasks(
  selection: DataviewSelection,
  options: ResolvedDataviewOptions,
): string {
  const className = options.className;
  const sections = groupedSections(selection);

  let output = "";
  let total = 0;
  for (const section of sections) {
    const items: string[] = [];
    for (const entry of section.entries) {
      for (const task of extractTasks(entry)) {
        items.push(renderTaskItem(task, entry, className));
        total += 1;
      }
    }
    if (items.length === 0) continue;
    output += `${renderGroupHeading(section.key, className)}<ul class="${escapeHtmlAttribute(`${className}__tasks`)}">${items.join("")}</ul>`;
  }

  return total === 0 ? renderEmpty(className) : output;
}

function renderCalendar(
  selection: DataviewSelection,
  spec: DataviewSpec,
  options: ResolvedDataviewOptions,
): string {
  const className = options.className;
  const field = spec.expression ?? "date";
  const path = field.split(".");

  const dated = selection.entries
    .map((entry) => ({
      entry,
      time: toDataviewTime(readDataviewField(entry, path)),
    }))
    .filter(
      (item): item is { entry: ContentManifestEntry; time: number } =>
        item.time !== null,
    );

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
    bucket.push(item.entry);
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

function groupedSections(selection: DataviewSelection): {
  key: string | null;
  entries: ContentManifestEntry[];
}[] {
  if (selection.grouped) {
    return selection.groups.map((group: DataviewGroup) => ({
      key: group.key,
      entries: group.entries,
    }));
  }
  return [{ key: null, entries: selection.entries }];
}

function renderGroupHeading(key: string | null, className: string): string {
  if (key === null) return "";
  return `<p class="${escapeHtmlAttribute(`${className}__group`)}">${escapeHtml(key)}</p>`;
}

function renderColumnValue(
  entry: ContentManifestEntry,
  column: DataviewColumn,
  className: string,
): string {
  return renderFieldValue(entry, column.field, className);
}

function renderMeta(
  entry: ContentManifestEntry,
  field: string,
  className: string,
): string {
  const value = renderFieldValue(entry, field.trim(), className);
  if (!value) return "";
  return ` <span class="${escapeHtmlAttribute(`${className}__meta`)}">${value}</span>`;
}

function renderFieldValue(
  entry: ContentManifestEntry,
  field: string,
  className: string,
): string {
  const normalized = field.trim();
  if (LINK_FIELDS.has(normalized) || TITLE_FIELDS.has(normalized)) {
    return renderEntryLink(entry, className);
  }
  if (normalized === "file.tags" || normalized === "tags") {
    return renderTags(entry.tags, className);
  }

  const value = readDataviewField(entry, normalized.split("."));
  return escapeHtml(formatValue(value));
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

function extractTasks(entry: ContentManifestEntry): ExtractedTask[] {
  const tasks: ExtractedTask[] = [];
  TASK_ITEM_PATTERN.lastIndex = 0;

  for (
    let match = TASK_ITEM_PATTERN.exec(entry.html);
    match !== null;
    match = TASK_ITEM_PATTERN.exec(entry.html)
  ) {
    const attributes = match[1] ?? "";
    const text = (match[2] ?? "").trim();
    tasks.push({ checked: /\bchecked\b/.test(attributes), text });
  }

  return tasks;
}

function renderTaskItem(
  task: ExtractedTask,
  entry: ContentManifestEntry,
  className: string,
): string {
  const status = task.checked ? "x" : " ";
  return `<li class="${escapeHtmlAttribute(`${className}__task`)}" data-task="${status}"><span class="${escapeHtmlAttribute(`${className}__task-text`)}">${task.text}</span> <a class="${escapeHtmlAttribute(`${className}__task-link`)}" href="${escapeHtmlAttribute(entry.permalink)}">${escapeHtml(entry.title)}</a></li>`;
}

function renderFallback(
  source: string,
  className: string,
  hideFallback: boolean,
): string {
  if (hideFallback) return "";
  const trimmed = source.trim();
  if (trimmed.length === 0) return "";
  return `<details class="${escapeHtmlAttribute(`${className}__fallback`)}"><summary class="${escapeHtmlAttribute(`${className}__fallback-summary`)}">Dataview query</summary><pre class="${escapeHtmlAttribute(`${className}__fallback-code`)}"><code>${escapeHtml(trimmed)}</code></pre></details>`;
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
