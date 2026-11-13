/**
 * @jsxRuntime automatic
 * @jsxImportSource hono/jsx
 */

import type { PostDiff } from "../types.js";

export type DiffLineData = PostDiff["lines"][number];

export function DiffLine({ line }: { line: DiffLineData }) {
  const prefix =
    line.type === "added" ? "+" : line.type === "removed" ? "-" : " ";
  return (
    <tr class={`rr-diff-history__line rr-diff-history__line--${line.type}`}>
      <td class="rr-diff-history__num">{line.oldLineNumber ?? ""}</td>
      <td class="rr-diff-history__num">{line.newLineNumber ?? ""}</td>
      <td class="rr-diff-history__code">
        <code>
          {prefix} {line.content}
        </code>
      </td>
    </tr>
  );
}

export function DiffPanel({ diff }: { diff: PostDiff }) {
  return (
    <div class="rr-diff-history__diff" data-rr-diff-rendered>
      <div class="rr-diff-history__table-wrap">
        <table class="rr-diff-history__table">
          <tbody>
            {diff.lines.map((line, index) => (
              <DiffLine
                key={`${line.oldLineNumber}-${line.newLineNumber}-${index}`}
                line={line}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
