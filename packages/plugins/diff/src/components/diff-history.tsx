import type { DiffRevision, PostDiff } from "../types.js";
import { escapeHtml } from "./diff-line.js";
import { renderDiffViewer } from "./diff-viewer.js";

export type DiffHistoryProps = {
  history: DiffRevision[];
  diffs: PostDiff[];
};

export function renderDiffHistory(input: DiffHistoryProps): string {
  const selected = input.diffs[0] ?? null;
  const payload = JSON.stringify(input).replace(/</g, "\\u003c");

  return `<section class="rr-diff-history" data-rr-diff-history>
  <div class="rr-diff-history__header">
    <h2 class="rr-diff-history__title">History</h2>
    <span class="rr-diff-history__count">${input.history.length} changes</span>
  </div>
  ${input.history.length === 0 || !selected ? renderEmptyState() : renderContent(input, selected)}
  <script type="application/json" data-rr-diff-history-data>${payload}</script>
</section>`;
}

function renderContent(input: DiffHistoryProps, selected: PostDiff): string {
  return `<div class="rr-diff-history__layout">
    <ol class="rr-diff-history__list" aria-label="Commit history">
      ${input.history.map((revision, index) => renderRevisionButton(revision, index === 0)).join("")}
    </ol>
    ${renderDiffViewer({ history: input.history, selected })}
  </div>`;
}

function renderEmptyState(): string {
  return `<p class="rr-diff-history__empty">No Git history is available for this article.</p>`;
}

function renderRevisionButton(
  revision: DiffRevision,
  selected: boolean,
): string {
  return `<li class="rr-diff-history__item">
    <button class="rr-diff-history__commit" type="button" data-rr-diff-select="${escapeHtml(revision.hash)}" aria-pressed="${selected}">
      <span class="rr-diff-history__date">${escapeHtml(formatDate(revision.date))}</span>
      <span class="rr-diff-history__message">${escapeHtml(revision.message || "Untitled change")}</span>
      <span class="rr-diff-history__meta">${escapeHtml(revision.shortHash)} · ${escapeHtml(revision.author)}</span>
    </button>
  </li>`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}
