import type { Diagnostic } from "@riebeckite/core";
import type { BibliographyEntry } from "./types.js";

export const SUPPORTED_TYPES = new Set([
  "article",
  "book",
  "inproceedings",
  "misc",
]);

export const NON_ENTRY_TYPES = new Set(["comment", "preamble", "string"]);

export const BUILTIN_MACROS = new Set([
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
]);

export type EntryParseResult =
  | {
      readonly kind: "entry";
      readonly entry: BibliographyEntry;
      readonly nextIndex: number;
      readonly diagnostics: Diagnostic[];
    }
  | { readonly kind: "skipped"; readonly nextIndex: number }
  | { readonly kind: "ignored" }
  | { readonly kind: "malformed"; readonly reason: string };

export function findEntryClose(text: string, openIndex: number): number {
  const open = text[openIndex];
  let depth = 0;
  let braceDepth = 0;
  let quoted = false;

  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && text[index - 1] !== "\\") {
      quoted = !quoted;
      continue;
    }
    if (quoted) continue;

    if (open === "{") {
      if (char === "{") depth += 1;
      else if (char === "}") {
        depth -= 1;
        if (depth === 0) return index;
      }
      continue;
    }

    if (char === "{") {
      braceDepth += 1;
      continue;
    }
    if (char === "}") {
      braceDepth -= 1;
      continue;
    }
    if (braceDepth > 0) continue;
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}
