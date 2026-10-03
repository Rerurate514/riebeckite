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
  <details class="rr-diff-history__panel" open>
  <summary class="rr-diff-history__header">
    <h2 class="rr-diff-history__title">History</h2>
    <span class="rr-diff-history__header-meta"><span class="rr-diff-history__count">${history.length} changes</span><span class="rr-diff-history__toggle-label rr-diff-history__toggle-label--open">Collapse</span><span class="rr-diff-history__toggle-label rr-diff-history__toggle-label--closed">Expand</span><span class="rr-diff-history__toggle" aria-hidden="true"><svg class="rr-diff-history__toggle-icon" viewBox="0 0 16 16" width="16" height="16" focusable="false"><path d="M5.2 3.4 10.8 8l-5.6 4.6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/></svg></span></span>
  </summary>
  ${history.length === 0 || !selected ? renderEmptyState() : renderContent(history, selected)}
  </details>
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
