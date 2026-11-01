import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import type { VaultActivity, VaultHeatmapSpec } from "./types.js";

export const VAULT_HEATMAP_CLASS = "rr-vault-heatmap";

type Cell = {
  readonly key: string;
  readonly date: Date;
  readonly future: boolean;
  readonly count: number;
};

export function renderVaultHeatmap(
  spec: VaultHeatmapSpec,
  activity: VaultActivity,
): string {
  const end = spec.end ?? activity.latest;
  if (!end) return renderEmpty(spec.title);

  const endDate = parseDate(end);
  const offset =
    spec.weekStart === "monday"
      ? (endDate.getUTCDay() + 6) % 7
      : endDate.getUTCDay();
  const gridEnd = addDays(endDate, 6 - offset);
  const gridStart = addDays(gridEnd, -(spec.weeks * 7 - 1));

  const cells: Cell[] = [];
  for (let index = 0; index < spec.weeks * 7; index += 1) {
    const date = addDays(gridStart, index);
    const key = formatDate(date);
    const future = date > endDate;
    cells.push({
      key,
      date,
      future,
      count: future ? 0 : countFor(activity, key),
    });
  }

  const max = Math.max(0, ...cells.map((cell) => cell.count));
  const columns: string[] = [];
  for (let week = 0; week < spec.weeks; week += 1) {
    const days = cells
      .slice(week * 7, week * 7 + 7)
      .map((cell) => renderCell(cell, max))
      .join("");
    columns.push(`<div class="${VAULT_HEATMAP_CLASS}__week">${days}</div>`);
  }

  const viewedTotal = cells.reduce((sum, cell) => sum + cell.count, 0);
  const viewedDays = cells.filter((cell) => cell.count > 0).length;
  const summary = `${viewedTotal} ${
    viewedTotal === 1 ? "update" : "updates"
  } on ${viewedDays} ${viewedDays === 1 ? "day" : "days"}`;
  const range = `${formatDate(gridStart)} to ${formatDate(gridEnd)}`;

  return [
    `<figure class="${VAULT_HEATMAP_CLASS}" data-rr-vault-heatmap>`,
    `<figcaption class="${VAULT_HEATMAP_CLASS}__title">${escapeHtml(spec.title)}</figcaption>`,
    `<div class="${VAULT_HEATMAP_CLASS}__grid" role="img" aria-label="${escapeHtmlAttribute(
      `${spec.title}: ${summary}, ${range}.`,
    )}">`,
    columns.join(""),
    "</div>",
    `<div class="${VAULT_HEATMAP_CLASS}__meta">`,
    `<span class="${VAULT_HEATMAP_CLASS}__summary">${escapeHtml(summary)}</span>`,
    `<span class="${VAULT_HEATMAP_CLASS}__range">${escapeHtml(range)}</span>`,
    renderLegend(),
    "</div>",
    "</figure>",
  ].join("");
}

export function renderVaultHeatmapError(message: string): string {
  return `<div class="${VAULT_HEATMAP_CLASS} ${VAULT_HEATMAP_CLASS}--error" role="status">${escapeHtml(message)}</div>`;
}

function renderCell(cell: Cell, max: number): string {
  const title = cell.future
    ? ""
    : ` title="${escapeHtmlAttribute(
        `${cell.key}: ${cell.count} ${cell.count === 1 ? "update" : "updates"}`,
      )}"`;
  return `<span class="${VAULT_HEATMAP_CLASS}__day" data-level="${levelFor(cell.count, max)}" data-date="${cell.key}"${cell.future ? ' data-future="true"' : ""}${title}></span>`;
}

function renderEmpty(title: string): string {
  return [
    `<figure class="${VAULT_HEATMAP_CLASS}" data-rr-vault-heatmap>`,
    `<figcaption class="${VAULT_HEATMAP_CLASS}__title">${escapeHtml(title)}</figcaption>`,
    `<div class="${VAULT_HEATMAP_CLASS}__empty">No dated vault activity.</div>`,
    "</figure>",
  ].join("");
}

function renderLegend(): string {
  const levels = [0, 1, 2, 3, 4]
    .map(
      (level) =>
        `<span class="${VAULT_HEATMAP_CLASS}__day" data-level="${level}"></span>`,
    )
    .join("");
  return `<span class="${VAULT_HEATMAP_CLASS}__legend" aria-hidden="true"><span>Less</span>${levels}<span>More</span></span>`;
}

function countFor(activity: VaultActivity, date: string): number {
  const day = activity.days[date];
  return day ? day.created + day.modified : 0;
}

function levelFor(count: number, max: number): number {
  if (count === 0) return 0;
  return Math.max(1, Math.ceil((count / Math.max(max, 1)) * 4));
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
