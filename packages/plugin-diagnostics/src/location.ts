export type SourcePosition = {
  line: number;
  column: number;
};

export class LineMapper {
  private starts: number[];

  constructor(text: string) {
    const starts = [0];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === "\n") starts.push(i + 1);
    }
    this.starts = starts;
  }

  positionAt(index: number): SourcePosition {
    const starts = this.starts;
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if ((starts[mid] ?? 0) <= index) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    return { line: low + 1, column: index - (starts[low] ?? 0) + 1 };
  }
}