import type { DiffRevision, PostDiff } from "../types.js";
import { escapeHtml, renderDiffLine } from "./diff-line.js";

export type DiffViewerProps = {
  history: DiffRevision[];
  selected: PostDiff;
};

export function renderDiffViewer({
  history,
  selected,
}: DiffViewerProps): string {
  return `<div class="rr-diff-history__viewer">
    <div class="rr-diff-history__controls">
      <label>From ${renderRevisionSelect("from", history, selected.from?.hash ?? "")}</label>
      <label>To ${renderRevisionSelect("to", history, selected.to.hash)}</label>
    </div>
    <div data-rr-diff-panel>${renderDiffPanel(selected)}</div>
  </div>`;
}

export function renderDiffPanel(diff: PostDiff): string {
  const fromLabel = diff.from?.shortHash ?? "Beginning";
  return `<div class="rr-diff-history__diff" data-rr-diff-rendered>
    <div class="rr-diff-history__diff-head">${escapeHtml(fromLabel)} → ${escapeHtml(diff.to.shortHash)}</div>
    <div class="rr-diff-history__table-wrap">
      <table class="rr-diff-history__table">
        <tbody>${diff.lines.map((line) => renderDiffLine({ line })).join("")}</tbody>
      </table>
    </div>
  </div>`;
}

function renderRevisionSelect(
  kind: "from" | "to",
  history: DiffRevision[],
  value: string,
): string {
  const emptyOption =
    kind === "from" ? `<option value="">Beginning</option>` : "";
  return `<select data-rr-diff-${kind}>${emptyOption}${history
    .map(
      (revision) =>
        `<option value="${escapeHtml(revision.hash)}"${revision.hash === value ? " selected" : ""}>${escapeHtml(revision.shortHash)} · ${escapeHtml(formatDate(revision.date))}</option>`,
    )
    .join("")}</select>`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}
