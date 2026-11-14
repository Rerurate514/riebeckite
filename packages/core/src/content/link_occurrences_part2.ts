import type {
  LinkOccurrence,
  LinkOccurrenceOptions,
  Node,
  SourceRange,
} from "./link_occurrences_part1.js";

export function markdownDestinationAt(
  value: string,
  offset: number,
  start: number,
): SourceRange | undefined {
  while (/\s/.test(value[start] ?? "")) start += 1;
  if (value[start] === "<") {
    const end = escapedIndexOf(value, ">", start + 1);
    return end < 0
      ? undefined
      : { start: offset + start + 1, end: offset + end };
  }
  let end = start;
  let depth = 0;
  while (end < value.length) {
    const character = value[end] ?? "";
    if (character === "\\") {
      end += 2;
      continue;
    }
    if (character === "(") depth += 1;
    if (character === ")") {
      if (depth === 0) break;
      depth -= 1;
    }
    if (depth === 0 && /\s/.test(character)) break;
    end += 1;
  }
  return end > start ? { start: offset + start, end: offset + end } : undefined;
}

export function definitionDestinationRange(
  source: string,
  range: SourceRange,
): SourceRange | undefined {
  const value = source.slice(range.start, range.end);
  const colon = value.indexOf("]:");
  if (colon < 0) return undefined;
  let start = colon + 2;
  while (/\s/.test(value[start] ?? "")) start += 1;
  if (value[start] === "<") {
    const end = escapedIndexOf(value, ">", start + 1);
    return end < 0
      ? undefined
      : { start: range.start + start + 1, end: range.start + end };
  }
  let end = start;
  while (end < value.length && !/\s/.test(value[end] ?? "")) {
    if (value[end] === "\\") end += 1;
    end += 1;
  }
  return end > start
    ? { start: range.start + start, end: range.start + end }
    : undefined;
}

export function escapedIndexOf(
  value: string,
  sought: string,
  start: number,
): number {
  for (let index = start; index < value.length; index += 1) {
    if (value[index] === "\\") {
      index += 1;
      continue;
    }
    if (value[index] === sought) return index;
  }
  return -1;
}

export function wikiOccurrences(
  source: string,
  options: LinkOccurrenceOptions,
  markdownRanges: readonly SourceRange[],
): LinkOccurrence[] {
  const occurrences: LinkOccurrence[] = [];
  for (let index = 0; index < source.length; index += 1) {
    if (
      within(index, markdownRanges) ||
      escaped(source, index) ||
      (source[index] !== "[" &&
        !(source[index] === "!" && source[index + 1] === "["))
    )
      continue;
    const embed = source[index] === "!";
    const open = embed ? index + 1 : index;
    if (source[open + 1] !== "[") continue;
    const close = source.indexOf("]]", open + 2);
    if (close < 0) continue;
    const bodyStart = open + 2;
    const body = source.slice(bodyStart, close);
    if (!body || /[\r\n]/.test(body)) continue;
    const aliasAt = body.indexOf("|");
    const targetAndFragment = aliasAt < 0 ? body : body.slice(0, aliasAt);
    const alias = aliasAt < 0 ? undefined : body.slice(aliasAt + 1);
    const fragmentAt = targetAndFragment.search(/[#^]/);
    const target = (
      fragmentAt < 0
        ? targetAndFragment
        : targetAndFragment.slice(0, fragmentAt)
    ).trim();
    if (!target) continue;
    const fragment =
      fragmentAt < 0 ? undefined : targetAndFragment.slice(fragmentAt);
    const destinationStart = bodyStart + targetAndFragment.indexOf(target);
    occurrences.push({
      ...options,
      syntax: embed ? "wiki-embed" : "wikilink",
      nodeRange: { start: index, end: close + 2 },
      destinationRange: {
        start: destinationStart,
        end: destinationStart + target.length,
      },
      rawDestination: target,
      normalizedDestination: target,
      ...(fragment ? { fragment } : {}),
      ...(alias ? { alias } : {}),
      embed,
      referenceDefinition: false,
      resolution: "unresolved",
    });
    index = close + 1;
  }
  return occurrences;
}

export function escaped(source: string, index: number): boolean {
  let count = 0;
  for (let cursor = index - 1; source[cursor] === "\\"; cursor -= 1) {
    count += 1;
  }
  return count % 2 === 1;
}

export function within(
  offset: number,
  ranges: readonly SourceRange[],
): boolean {
  return ranges.some((range) => offset >= range.start && offset < range.end);
}

export function fragmentOf(destination: string): string | undefined {
  const index = destination.indexOf("#");
  return index < 0 ? undefined : destination.slice(index);
}

export function visit(node: Node, callback: (node: Node) => void): void {
  callback(node);
  for (const child of node.children ?? []) visit(child, callback);
}
