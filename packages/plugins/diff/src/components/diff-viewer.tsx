/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */

import { renderToString } from "hono/jsx/dom/server";
import type { DiffRevision, PostDiff } from "../types.js";
import { escapeHtml } from "./diff-line.js";
import { DiffPanel } from "./diff-panel.js";
import { formatDiffDate } from "./format-date.js";

type DiffViewerProps = {
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
    <p class="rr-diff-history__status" data-loading aria-live="polite" hidden>Loading revision…</p>
    <p class="rr-diff-history__error" data-loading-error role="alert" hidden></p>
    <div data-rr-diff-panel data-loading-content>${renderDiffPanel(selected)}</div>
  </div>`;
}

export function renderDiffPanel(diff: PostDiff): string {
  return renderToString(<DiffPanel diff={diff} />);
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
        `<option value="${escapeHtml(revision.hash)}"${revision.hash === value ? " selected" : ""}>${escapeHtml(revision.shortHash)} · ${escapeHtml(formatDiffDate(revision.date))}</option>`,
    )
    .join("")}</select>`;
}
