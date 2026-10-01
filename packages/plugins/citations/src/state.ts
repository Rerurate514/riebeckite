import type { Diagnostic } from "@riebeckite/core";
import type { BibliographyCache } from "./types.js";

export type CitationState = {
  readonly bibliographies: BibliographyCache;
  readonly diagnostics: Diagnostic[];
};

export function createCitationState(): CitationState {
  return { bibliographies: new Map(), diagnostics: [] };
}
