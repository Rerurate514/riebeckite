import { escapeHtml } from "../src/components/diff-line.js";
import { createLineDiff } from "../src/diff/line_diff.js";
import type { MarkdownRevision, PostDiff } from "../src/types.js";

type DiffHistoryPayload = {
  path?: string;
  revisions?: MarkdownRevision[];
};

export function initDiffHistory() {
  for (const root of document.querySelectorAll<HTMLElement>(
    "[data-rr-diff-history]",
  )) {
    initDiffHistoryRoot(root);
  }
}

function initDiffHistoryRoot(root: HTMLElement) {
  const payload = readPayload(root);
  if (!payload) return;
  let revisions = revisionsMap(payload.revisions ?? []);
  let revisionsRequest: Promise<ReadonlyMap<
    string,
    MarkdownRevision
  > | null> | null = null;

  const fromSelect = root.querySelector<HTMLSelectElement>(
    "[data-rr-diff-from]",
  );
  const toSelect = root.querySelector<HTMLSelectElement>("[data-rr-diff-to]");
  const panel = root.querySelector<HTMLElement>("[data-rr-diff-panel]");
  if (!fromSelect || !toSelect || !panel) return;

  for (const button of root.querySelectorAll<HTMLButtonElement>(
    "[data-rr-diff-select]",
  )) {
    button.addEventListener("click", () => {
      const toHash = button.dataset.rrDiffSelect;
      if (!toHash) return;
      void updateDiff({
        root,
        panel,
        getRevisions: () => revisions,
        setRevisions: (loaded) => {
          revisions = loaded;
        },
        load: () => {
          revisionsRequest ??= loadRevisions(payload.path);
          return revisionsRequest;
        },
        fromHash: fromSelect.value,
        toHash,
        fromSelect,
        toSelect,
      });
    });
  }

  const updateFromSelects = () => {
    void updateDiff({
      root,
      panel,
      getRevisions: () => revisions,
      setRevisions: (loaded) => {
        revisions = loaded;
      },
      load: () => {
        revisionsRequest ??= loadRevisions(payload.path);
        return revisionsRequest;
      },
      fromHash: fromSelect.value,
      toHash: toSelect.value,
      fromSelect,
      toSelect,
    });
  };

  fromSelect.addEventListener("change", updateFromSelects);
  toSelect.addEventListener("change", updateFromSelects);
}

async function updateDiff(input: {
  root: HTMLElement;
  panel: HTMLElement;
  getRevisions: () => ReadonlyMap<string, MarkdownRevision>;
  setRevisions: (revisions: ReadonlyMap<string, MarkdownRevision>) => void;
  load: () => Promise<ReadonlyMap<string, MarkdownRevision> | null>;
  fromHash: string;
  toHash: string;
  fromSelect: HTMLSelectElement;
  toSelect: HTMLSelectElement;
}) {
  const { root, panel, fromHash, toHash, fromSelect, toSelect } = input;
  const token = `${fromHash}\n${toHash}`;
  root.dataset.rrDiffPending = token;
  const loaded = await input.load();
  if (loaded) input.setRevisions(loaded);
  if (root.dataset.rrDiffPending !== token) return;
  const diff = createDiff(input.getRevisions(), fromHash, toHash);
  if (!diff) return;
  fromSelect.value = diff.from?.hash ?? "";
  toSelect.value = diff.to.hash;
  updateSelectedCommit(root, diff.to.hash);
  renderPanel(panel, diff);
}

async function loadRevisions(
  path: string | undefined,
): Promise<ReadonlyMap<string, MarkdownRevision> | null> {
  if (!path) return null;
  try {
    const response = await fetch(path);
    if (!response.ok) return null;
    const payload = (await response.json()) as DiffHistoryPayload;
    return revisionsMap(payload.revisions ?? []);
  } catch {
    return null;
  }
}

function revisionsMap(
  revisions: readonly MarkdownRevision[],
): ReadonlyMap<string, MarkdownRevision> {
  return new Map(revisions.map((revision) => [revision.hash, revision]));
}

function createDiff(
  revisions: ReadonlyMap<string, MarkdownRevision>,
  fromHash: string,
  toHash: string,
): PostDiff | null {
  const to = revisions.get(toHash);
  if (!to) return null;

  const from = fromHash ? revisions.get(fromHash) : null;
  if (fromHash && !from) return null;

  return {
    from: from ?? null,
    to,
    lines: createLineDiff(from?.markdown ?? "", to.markdown),
  };
}

function readPayload(root: HTMLElement): DiffHistoryPayload | null {
  const script = root.querySelector<HTMLScriptElement>(
    "[data-rr-diff-history-data]",
  );
  if (!script?.textContent) return null;

  try {
    return JSON.parse(script.textContent) as DiffHistoryPayload;
  } catch {
    return null;
  }
}

function updateSelectedCommit(root: HTMLElement, hash: string) {
  for (const button of root.querySelectorAll<HTMLButtonElement>(
    "[data-rr-diff-select]",
  )) {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.rrDiffSelect === hash),
    );
  }
}

function renderPanel(panel: HTMLElement, diff: PostDiff) {
  panel.innerHTML = `<div class="rr-diff-history__diff" data-rr-diff-rendered>
    <div class="rr-diff-history__table-wrap">
      <table class="rr-diff-history__table">
        <tbody>${diff.lines.map(renderLine).join("")}</tbody>
      </table>
    </div>
  </div>`;
}

function renderLine(line: PostDiff["lines"][number]): string {
  const prefix =
    line.type === "added" ? "+" : line.type === "removed" ? "-" : " ";
  return `<tr class="rr-diff-history__line rr-diff-history__line--${line.type}">
    <td class="rr-diff-history__num">${line.oldLineNumber ?? ""}</td>
    <td class="rr-diff-history__num">${line.newLineNumber ?? ""}</td>
    <td class="rr-diff-history__code"><code>${prefix} ${escapeHtml(line.content)}</code></td>
  </tr>`;
}
