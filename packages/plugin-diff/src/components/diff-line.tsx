import type { PostDiff } from "../types.js";

export type DiffLineProps = {
  line: PostDiff["lines"][number];
};

export function renderDiffLine({ line }: DiffLineProps): string {
  const prefix =
    line.type === "added" ? "+" : line.type === "removed" ? "-" : " ";
  return `<tr class="rr-diff-history__line rr-diff-history__line--${line.type}">
    <td class="rr-diff-history__num">${line.oldLineNumber ?? ""}</td>
    <td class="rr-diff-history__num">${line.newLineNumber ?? ""}</td>
    <td class="rr-diff-history__code"><code>${prefix} ${escapeHtml(line.content)}</code></td>
  </tr>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
