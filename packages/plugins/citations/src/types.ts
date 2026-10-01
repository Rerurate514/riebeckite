import type { ContentSource, Diagnostic } from "@riebeckite/core";

export type CitationsOptions = {
  /** Vault-relative BibTeX/BibLaTeX file path or paths. */
  bibliography?: string | readonly string[];
  /** Heading inserted above generated references. Defaults to "References". */
  referencesHeading?: string;
};

export type BibliographyEntry = {
  readonly key: string;
  readonly type: "article" | "book" | "inproceedings" | "misc" | string;
  readonly fields: Readonly<Record<string, string>>;
};

export type CitationSyntax = "bracket" | "inline" | "suppress-author";

export type CitationReference = {
  readonly key: string;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly suppressAuthor: boolean;
};

export type CitationOccurrence = {
  readonly id: string;
  readonly pageSlug?: string;
  readonly references: readonly CitationReference[];
  readonly label: string;
  readonly syntax: CitationSyntax;
};

export type ResolvedCitation = CitationReference & {
  readonly entry?: BibliographyEntry;
  readonly number?: number;
};

export type ParsedBibliography = {
  readonly entries: ReadonlyMap<string, BibliographyEntry>;
  readonly diagnostics: readonly Diagnostic[];
};

export type CachedBibliography = {
  readonly found: boolean;
  readonly parsed: ParsedBibliography;
};

export type BibliographyCache = Map<string, Promise<CachedBibliography>>;

export type RemarkCitationsOptions = CitationsOptions & {
  readonly sourceSlug?: string;
  readonly contentSource?: ContentSource;
  readonly diagnostics: Diagnostic[];
  readonly cache: BibliographyCache;
  readonly loadBibliography: (path: string) => Promise<string | null>;
};
