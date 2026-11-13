/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */

import { renderToString } from "hono/jsx/dom/server";
import type { DiffRevision, MarkdownRevision, PostDiff } from "../types.js";
import { DiffViewer } from "./diff-viewer.js";
import { formatDiffDate } from "./format-date.js";

type DiffHistoryInput = {
  revisions: MarkdownRevision[];
  selected: PostDiff | null;
  payloadPath?: string;
};

type DiffHistoryProps = {
  revisions: MarkdownRevision[];
  selected: PostDiff;
  payloadPath?: string;
};

export function renderDiffHistory(input: DiffHistoryInput): string {
  const selected = input.selected;
  if (input.revisions.length === 0 || !selected) return "";
  return renderToString(
    <DiffHistory
      revisions={input.revisions}
      selected={selected}
      payloadPath={input.payloadPath}
    />,
  );
}

function DiffHistory({ revisions, selected, payloadPath }: DiffHistoryProps) {
  return (
    <section class="rr-diff-history" data-rr-diff-history>
      <details class="rr-diff-history__panel">
        <summary class="rr-diff-history__header">
          <h2 class="rr-diff-history__title">History</h2>
          <span class="rr-diff-history__header-meta">
            <span class="rr-diff-history__count">
              {revisions.length} changes
            </span>
            <span class="rr-diff-history__toggle-label rr-diff-history__toggle-label--open">
              Collapse
            </span>
            <span class="rr-diff-history__toggle-label rr-diff-history__toggle-label--closed">
              Expand
            </span>
            <span class="rr-diff-history__toggle" aria-hidden="true">
              <svg
                class="rr-diff-history__toggle-icon"
                viewBox="0 0 16 16"
                width="16"
                height="16"
                focusable="false"
              >
                <title>Toggle history</title>
                <path
                  d="M5.2 3.4 10.8 8l-5.6 4.6"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.8"
                />
              </svg>
            </span>
          </span>
        </summary>
        <div class="rr-diff-history__layout">
          <ol class="rr-diff-history__list" aria-label="Commit history">
            {revisions.map((revision, index) => (
              <RevisionButton
                key={revision.hash}
                revision={revision}
                selected={index === 0}
              />
            ))}
          </ol>
          <DiffViewer history={revisions} selected={selected} />
        </div>
      </details>
      {payloadPath ? (
        <script
          type="application/json"
          data-rr-diff-history-data
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({ path: payloadPath }).replace(
              /</g,
              "\\u003c",
            ),
          }}
        />
      ) : null}
    </section>
  );
}

function RevisionButton({
  revision,
  selected,
}: {
  revision: DiffRevision;
  selected: boolean;
}) {
  return (
    <li class="rr-diff-history__item">
      <button
        class="rr-diff-history__commit"
        type="button"
        data-rr-diff-select={revision.hash}
        aria-pressed={selected ? "true" : "false"}
      >
        <span class="rr-diff-history__date">
          {formatDiffDate(revision.date)}
        </span>
        <span class="rr-diff-history__message">
          {revision.message || "Untitled change"}
        </span>
        <span class="rr-diff-history__meta">
          {revision.shortHash} · {revision.author}
        </span>
      </button>
    </li>
  );
}
