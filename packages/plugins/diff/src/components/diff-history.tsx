import type { DiffRevision, MarkdownRevision, PostDiff } from "../types.js";
import { escapeHtml } from "./diff-line.js";
import { renderDiffViewer } from "./diff-viewer.js";
import { formatDiffDate } from "./format-date.js";

export type DiffHistoryProps = {
  revisions: MarkdownRevision[];
  selected: PostDiff | null;
};

export function renderDiffHistory(input: DiffHistoryProps): string {
  const history = input.revisions;
  const selected = input.selected;
  const payload = JSON.stringify({ revisions: input.revisions }).replace(
    /</g,
    "\\u003c",
  );

  return `<section class="rr-diff-history" data-rr-diff-history>
  <div class="rr-diff-history__header">
    <h2 class="rr-diff-history__title">History</h2>
    <span class="rr-diff-history__count">${history.length} changes</span>
  </div>
  ${history.length === 0 || !selected ? renderEmptyState() : renderContent(history, selected)}
  <script type="application/json" data-rr-diff-history-data>${payload}</script>
</section>`;
}

function renderContent(
  history: MarkdownRevision[],
  selected: PostDiff,
): string {
  return `<div class="rr-diff-history__layout">
    <ol class="rr-diff-history__list" aria-label="Commit history">
      ${history.map((revision, index) => renderRevisionButton(revision, index === 0)).join("")}
    </ol>
    ${renderDiffViewer({ history, selected })}
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
      <span class="rr-diff-history__date">${escapeHtml(formatDiffDate(revision.date))}</span>
      <span class="rr-diff-history__message">${escapeHtml(revision.message || "Untitled change")}</span>
      <span class="rr-diff-history__meta">${escapeHtml(revision.shortHash)} · ${escapeHtml(revision.author)}</span>
    </button>
  </li>`;
}
