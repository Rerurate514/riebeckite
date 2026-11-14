import remarkParse from "remark-parse";
import { unified } from "unified";
import {
  definitionDestinationRange,
  fragmentOf,
  markdownDestinationAt,
  visit,
  wikiOccurrences,
} from "./link_occurrences_part2.js";

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

export type Position = {
  readonly start?: { readonly offset?: number };
  readonly end?: { readonly offset?: number };
};

export type Node = {
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

export function codeRanges(source: string): SourceRange[] {
  const ranges: SourceRange[] = [];
  visit(unified().use(remarkParse).parse(source) as Node, (node) => {
    if (node.type !== "code" && node.type !== "inlineCode") return;
    const range = nodeRange(node);
    if (range) ranges.push(range);
  });
  return ranges;
}

export function markdownOccurrences(
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
          : markdownDestinationRange(source, range, node);
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

export function nodeRange(node: Node): SourceRange | undefined {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  return typeof start === "number" && typeof end === "number"
    ? { start, end }
    : undefined;
}

export function markdownDestinationRange(
  source: string,
  range: SourceRange,
  node: Node,
): SourceRange | undefined {
  const value = source.slice(range.start, range.end);
  const labelEnd = markdownLabelEnd(value, node, range.start);
  if (labelEnd === undefined) return undefined;
  const close = value.indexOf("]", labelEnd);
  if (close < 0 || value[close + 1] !== "(") return undefined;
  return markdownDestinationAt(value, range.start, close + 2);
}

export function markdownLabelEnd(
  value: string,
  node: Node,
  offset: number,
): number | undefined {
  if (node.type === "link" && Array.isArray(node.children)) {
    const last = node.children[node.children.length - 1] as Node | undefined;
    const end = last?.position?.end?.offset;
    if (typeof end === "number") return end - offset;
    return 1;
  }
  const start = node.type === "image" ? 2 : 1;
  let depth = 0;
  for (let index = start; index < value.length; index += 1) {
    const character = value[index] ?? "";
    if (character === "\\") {
      index += 1;
      continue;
    }
    if (character === "[") depth += 1;
    if (character === "]") {
      if (depth === 0) return index;
      depth -= 1;
    }
  }
  return undefined;
}
