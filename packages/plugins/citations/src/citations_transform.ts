import type { Text } from "mdast";
import { renderCitation } from "./citations_render.js";
import type { CitationMatch, RenderContext } from "./citations_types.js";
import type {
  BibliographyEntry,
  CitationReference,
  RemarkCitationsOptions,
} from "./types.js";

export function createRenderContext(
  options: RemarkCitationsOptions,
  entries: ReadonlyMap<string, BibliographyEntry>,
): RenderContext {
  return {
    entries,
    numbers: new Map(),
    orderedKeys: [],
    referenceIds: new Map(),
    usedReferenceIds: new Set(),
    occurrences: [],
    options,
  };
}

export function transformTextNode(
  node: Text,
  context: RenderContext,
): unknown[] {
  const segments: unknown[] = [];
  let cursor = 0;
  for (const match of findCitations(node.value)) {
    if (match.start > cursor)
      segments.push({
        type: "text",
        value: node.value.slice(cursor, match.start),
      });
    segments.push(renderCitation(match.references, match.bracketed, context));
    cursor = match.end;
  }
  if (segments.length === 0) return [node];
  if (cursor < node.value.length)
    segments.push({ type: "text", value: node.value.slice(cursor) });
  return segments;
}

export function findCitations(value: string): CitationMatch[] {
  const matches: CitationMatch[] = [];
  const ignoredRanges = findWikiLinkRanges(value);
  const bracketPattern = /\[([^\]]*@[-A-Za-z0-9_:.]+[^\]]*)\]/g;
  for (const match of value.matchAll(bracketPattern)) {
    if (
      value[match.index - 1] === "[" ||
      value[match.index + match[0].length] === "]"
    ) {
      continue;
    }
    if (
      rangeOverlaps(ignoredRanges, match.index, match.index + match[0].length)
    )
      continue;
    const references = parseBracketCitation(match[1]);
    if (references.length === 0) continue;
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      references,
      bracketed: true,
    });
  }
  const inlinePattern = /(^|[\s(])@([-A-Za-z0-9_:.]+)(?=\b)/g;
  for (const match of value.matchAll(inlinePattern)) {
    const start = match.index + match[1].length;
    if (rangeOverlaps(ignoredRanges, start, start + match[2].length + 1))
      continue;
    if (overlaps(matches, start, start + match[2].length + 1)) continue;
    matches.push({
      start,
      end: start + match[2].length + 1,
      bracketed: false,
      references: [{ key: match[2], suppressAuthor: false }],
    });
  }
  return matches.toSorted((a, b) => a.start - b.start);
}

export function findWikiLinkRanges(
  value: string,
): readonly { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  const pattern = /\[\[[\s\S]*?\]\]/g;
  for (const match of value.matchAll(pattern)) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }
  return ranges;
}

export function rangeOverlaps(
  ranges: readonly { start: number; end: number }[],
  start: number,
  end: number,
): boolean {
  return ranges.some((range) => start < range.end && end > range.start);
}

export function parseBracketCitation(input: string): CitationReference[] {
  return input
    .split(";")
    .map((part) => parseCitationPart(part.trim()))
    .filter((part): part is CitationReference => Boolean(part));
}

export function parseCitationPart(part: string): CitationReference | null {
  const match =
    /^(?<prefix>.*?)\s*(?<suppress>-?)@(?<key>[-A-Za-z0-9_:.]+)(?<suffix>.*)$/.exec(
      part,
    );
  if (!match?.groups) return null;
  return {
    key: match.groups.key,
    prefix: match.groups.prefix.trim() || undefined,
    suffix: match.groups.suffix.trim() || undefined,
    suppressAuthor: match.groups.suppress === "-",
  };
}

export function overlaps(
  matches: readonly CitationMatch[],
  start: number,
  end: number,
): boolean {
  return matches.some((match) => start < match.end && end > match.start);
}
