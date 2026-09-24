import type { DiffLine } from "../types.js";

export function createLineDiff(
  fromMarkdown: string,
  toMarkdown: string,
): DiffLine[] {
  const fromLines = splitLines(fromMarkdown);
  const toLines = splitLines(toMarkdown);
  const table = buildLongestCommonSubsequenceTable(fromLines, toLines);
  const lines: DiffLine[] = [];
  let fromIndex = 0;
  let toIndex = 0;

  while (fromIndex < fromLines.length && toIndex < toLines.length) {
    if (fromLines[fromIndex] === toLines[toIndex]) {
      lines.push({ type: "context", content: fromLines[fromIndex] });
      fromIndex += 1;
      toIndex += 1;
      continue;
    }

    if (table[fromIndex + 1][toIndex] >= table[fromIndex][toIndex + 1]) {
      lines.push({ type: "removed", content: fromLines[fromIndex] });
      fromIndex += 1;
    } else {
      lines.push({ type: "added", content: toLines[toIndex] });
      toIndex += 1;
    }
  }

  while (fromIndex < fromLines.length) {
    lines.push({ type: "removed", content: fromLines[fromIndex] });
    fromIndex += 1;
  }

  while (toIndex < toLines.length) {
    lines.push({ type: "added", content: toLines[toIndex] });
    toIndex += 1;
  }

  return lines;
}

function splitLines(markdown: string): string[] {
  if (!markdown) return [];
  return markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function buildLongestCommonSubsequenceTable(
  fromLines: string[],
  toLines: string[],
): number[][] {
  const table = Array.from({ length: fromLines.length + 1 }, () =>
    Array.from({ length: toLines.length + 1 }, () => 0),
  );

  for (let fromIndex = fromLines.length - 1; fromIndex >= 0; fromIndex -= 1) {
    for (let toIndex = toLines.length - 1; toIndex >= 0; toIndex -= 1) {
      table[fromIndex][toIndex] =
        fromLines[fromIndex] === toLines[toIndex]
          ? table[fromIndex + 1][toIndex + 1] + 1
          : Math.max(
              table[fromIndex + 1][toIndex],
              table[fromIndex][toIndex + 1],
            );
    }
  }

  return table;
}
