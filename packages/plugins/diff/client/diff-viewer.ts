import { escapeHtml } from "../src/components/diff-line.js";
import type { PostDiff } from "../src/types.js";

type DiffHistoryPayload = {
  diffs: PostDiff[];
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
  if (!payload || payload.diffs.length === 0) return;

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
      const diff = payload.diffs.find((entry) => entry.to.hash === toHash);
      if (!diff) return;
      fromSelect.value = diff.from?.hash ?? "";
      toSelect.value = diff.to.hash;
      updateSelectedCommit(root, diff.to.hash);
      renderPanel(panel, diff);
    });
  }

  const updateFromSelects = () => {
    const diff = payload.diffs.find(
      (entry) =>
        (entry.from?.hash ?? "") === fromSelect.value &&
        entry.to.hash === toSelect.value,
    );
    if (!diff) return;
    updateSelectedCommit(root, diff.to.hash);
    renderPanel(panel, diff);
  };

  fromSelect.addEventListener("change", updateFromSelects);
  toSelect.addEventListener("change", updateFromSelects);
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
  const fromLabel = diff.from?.shortHash ?? "Beginning";
  panel.innerHTML = `<div class="rr-diff-history__diff" data-rr-diff-rendered>
    <div class="rr-diff-history__diff-head">${escapeHtml(fromLabel)} → ${escapeHtml(diff.to.shortHash)}</div>
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
