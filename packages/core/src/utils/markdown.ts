export type MarkdownFenceLine = {
  readonly value: string;
  readonly inFence: boolean;
};

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})\s*$/;

export function scanMarkdownFenceLines(source: string): MarkdownFenceLine[] {
  const lines: MarkdownFenceLine[] = [];
  let fence: { marker: string; length: number } | null = null;

  for (const value of source.split("\n")) {
    if (fence === null) {
      const open = FENCE_OPEN.exec(value);
      if (open && !(open[1][0] === "`" && open[2].includes("`"))) {
        fence = { marker: open[1][0], length: open[1].length };
      }
      lines.push({ value, inFence: false });
      continue;
    }

    const close = FENCE_CLOSE.exec(value);
    if (
      close &&
      close[1][0] === fence.marker &&
      close[1].length >= fence.length
    ) {
      fence = null;
      lines.push({ value, inFence: false });
      continue;
    }

    lines.push({ value, inFence: true });
  }

  return lines;
}
