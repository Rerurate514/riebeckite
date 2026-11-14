import type {
  BibliographyEntry,
  CitationOccurrence,
  CitationReference,
  RemarkCitationsOptions,
} from "./types.js";

export type Tree = {
  type?: string;
  children?: unknown[];
  value?: string;
  name?: string;
  attributes?: Record<string, unknown>;
};

export type Parent = { children?: unknown[]; type?: string };

export type MarkdownFile = { data?: Record<string, unknown> };

export type RenderContext = {
  readonly entries: ReadonlyMap<string, BibliographyEntry>;
  readonly numbers: Map<string, number>;
  readonly orderedKeys: string[];
  readonly referenceIds: Map<string, string>;
  readonly usedReferenceIds: Set<string>;
  readonly occurrences: CitationOccurrence[];
  readonly options: RemarkCitationsOptions;
};

export type CitationMatch = {
  readonly start: number;
  readonly end: number;
  readonly references: readonly CitationReference[];
  readonly bracketed: boolean;
};
