import remarkParse from "remark-parse";
import { unified } from "unified";

export type SourceRange = {
  readonly start: number;
  readonly end: number;
};

export type LinkSyntaxKind =
  | "markdown-link"
  | "markdown-image"
  | "reference-link"
  | "reference-definition"
  | "wikilink"
  | "wiki-embed";

export type LinkOccurrence = {
  readonly sourceContentId?: string;
  readonly sourcePath?: string;
  readonly syntax: LinkSyntaxKind;
  readonly nodeRange: SourceRange;
  readonly destinationRange?: SourceRange;
  readonly rawDestination: string;
  readonly normalizedDestination: string;
  readonly fragment?: string;
  readonly alias?: string;
  readonly referenceLabel?: string;
  readonly embed: boolean;
  readonly referenceDefinition: boolean;
  readonly resolution: "unresolved" | "resolved" | "ambiguous" | "unsupported";
  readonly evidence?: string;
  readonly reason?: string;
};

export type LinkOccurrenceOptions = {
  readonly sourceContentId?: string;
  readonly sourcePath?: string;
};

type Position = {
  readonly start?: { readonly offset?: number };
  readonly end?: { readonly offset?: number };
};
type Node = {
  readonly type?: string;
  readonly url?: unknown;
  readonly identifier?: unknown;
  readonly label?: unknown;
  readonly position?: Position;
  readonly children?: readonly Node[];
};

export function extractLinkOccurrences(
  source: string,
  options: LinkOccurrenceOptions = {},
): readonly LinkOccurrence[] {
  const markdown = markdownOccurrences(source, options);
  const protectedRanges = markdown
    .filter(
      (occurrence) =>
        occurrence.syntax === "markdown-link" ||
        occurrence.syntax === "markdown-image",
    )
    .map((occurrence) => occurrence.nodeRange);
  protectedRanges.push(...codeRanges(source));
  return [
    ...markdown,
    ...wikiOccurrences(source, options, protectedRanges),
  ].toSorted((left, right) => left.nodeRange.start - right.nodeRange.start);
}

function codeRanges(source: string): SourceRange[] {
  const ranges: SourceRange[] = [];
  visit(unified().use(remarkParse).parse(source) as Node, (node) => {
    if (node.type !== "code" && node.type !== "inlineCode") return;
    const range = nodeRange(node);
    if (range) ranges.push(range);
  });
  return ranges;
}

function markdownOccurrences(
  source: string,
  options: LinkOccurrenceOptions,
): LinkOccurrence[] {
  const occurrences: LinkOccurrence[] = [];
  const tree = unified().use(remarkParse).parse(source) as Node;
  visit(tree, (node) => {
    const range = nodeRange(node);
    if (!range) return;
    if (
      node.type === "link" ||
      node.type === "image" ||
      node.type === "definition"
    ) {
      if (typeof node.url !== "string") return;
      const destinationRange =
        node.type === "definition"
          ? definitionDestinationRange(source, range)
          : markdownDestinationRange(source, range);
      if (!destinationRange) return;
      const rawDestination = source.slice(
        destinationRange.start,
        destinationRange.end,
      );
      occurrences.push({
        ...options,
        syntax:
          node.type === "image"
            ? "markdown-image"
            : node.type === "definition"
              ? "reference-definition"
              : "markdown-link",
        nodeRange: range,
        destinationRange,
        rawDestination,
        normalizedDestination: node.url,
        fragment: fragmentOf(node.url),
        ...(node.type === "definition" && typeof node.identifier === "string"
          ? { referenceLabel: node.identifier }
          : {}),
        embed: node.type === "image",
        referenceDefinition: node.type === "definition",
        resolution: "unresolved",
      });
      return;
    }
    if (node.type === "linkReference" || node.type === "imageReference") {
      const label =
        typeof node.identifier === "string"
          ? node.identifier
          : typeof node.label === "string"
            ? node.label
            : "";
      occurrences.push({
        ...options,
        syntax: "reference-link",
        nodeRange: range,
        rawDestination: label,
        normalizedDestination: label,
        referenceLabel: label,
        embed: node.type === "imageReference",
        referenceDefinition: false,
        resolution: "unresolved",
        evidence: "reference-label",
      });
    }
  });
  return occurrences;
}

function nodeRange(node: Node): SourceRange | undefined {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  return typeof start === "number" && typeof end === "number"
    ? { start, end }
    : undefined;
}

function markdownDestinationRange(
  source: string,
  range: SourceRange,
): SourceRange | undefined {
  const value = source.slice(range.start, range.end);
  const open = value.indexOf("](");
  if (open < 0) return undefined;
  let start = open + 2;
  while (/\s/.test(value[start] ?? "")) start += 1;
  if (value[start] === "<") {
    const end = escapedIndexOf(value, ">", start + 1);
    return end < 0
      ? undefined
      : { start: range.start + start + 1, end: range.start + end };
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
  return end > start
    ? { start: range.start + start, end: range.start + end }
    : undefined;
}

function definitionDestinationRange(
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

function escapedIndexOf(value: string, sought: string, start: number): number {
  for (let index = start; index < value.length; index += 1) {
    if (value[index] === "\\") {
      index += 1;
      continue;
    }
    if (value[index] === sought) return index;
  }
  return -1;
}

function wikiOccurrences(
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

function escaped(source: string, index: number): boolean {
  let count = 0;
  for (let cursor = index - 1; source[cursor] === "\\"; cursor -= 1) {
    count += 1;
  }
  return count % 2 === 1;
}

function within(offset: number, ranges: readonly SourceRange[]): boolean {
  return ranges.some((range) => offset >= range.start && offset < range.end);
}

function fragmentOf(destination: string): string | undefined {
  const index = destination.indexOf("#");
  return index < 0 ? undefined : destination.slice(index);
}

function visit(node: Node, callback: (node: Node) => void): void {
  callback(node);
  for (const child of node.children ?? []) visit(child, callback);
}
