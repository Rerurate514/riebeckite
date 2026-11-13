/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */

import { renderToString } from "hono/jsx/dom/server";
import type { DiffRevision, PostDiff } from "../types.js";
import { DiffPanel } from "./diff-panel.js";
import { formatDiffDate } from "./format-date.js";

type DiffViewerProps = {
  history: DiffRevision[];
  selected: PostDiff;
};

export function renderDiffViewer(props: DiffViewerProps): string {
  return renderToString(<DiffViewer {...props} />);
}

export function DiffViewer({ history, selected }: DiffViewerProps) {
  const idPrefix = `rr-diff-${selected.to.hash.slice(0, 12)}`;
  return (
    <div class="rr-diff-history__viewer">
      <div class="rr-diff-history__controls">
        <label for={`${idPrefix}-from`}>
          From{" "}
          <RevisionSelect
            idPrefix={idPrefix}
            kind="from"
            history={history}
            value={selected.from?.hash ?? ""}
          />
        </label>
        <label for={`${idPrefix}-to`}>
          To{" "}
          <RevisionSelect
            idPrefix={idPrefix}
            kind="to"
            history={history}
            value={selected.to.hash}
          />
        </label>
      </div>
      <p class="rr-diff-history__status" data-loading aria-live="polite" hidden>
        Loading revision…
      </p>
      <p
        class="rr-diff-history__error"
        data-loading-error
        role="alert"
        hidden
      />
      <div data-rr-diff-panel data-loading-content>
        <DiffPanel diff={selected} />
      </div>
    </div>
  );
}

export function renderDiffPanel(diff: PostDiff): string {
  return renderToString(<DiffPanel diff={diff} />);
}

function RevisionSelect({
  idPrefix,
  kind,
  history,
  value,
}: {
  idPrefix: string;
  kind: "from" | "to";
  history: DiffRevision[];
  value: string;
}) {
  return (
    <select id={`${idPrefix}-${kind}`} {...{ [`data-rr-diff-${kind}`]: "" }}>
      {kind === "from" ? <option value="">Beginning</option> : null}
      {history.map((revision) => (
        <option
          key={revision.hash}
          value={revision.hash}
          selected={revision.hash === value}
        >
          {revision.shortHash} · {formatDiffDate(revision.date)}
        </option>
      ))}
    </select>
  );
}
