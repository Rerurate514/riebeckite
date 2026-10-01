import type { Diagnostic } from "@riebeckite/core";
import type { BibliographyEntry, ParsedBibliography } from "./types.js";

const SUPPORTED_TYPES = new Set(["article", "book", "inproceedings", "misc"]);

/** Entry types that carry no citation key and are ignored on purpose. */
const NON_ENTRY_TYPES = new Set(["comment", "preamble", "string"]);

/** Macros defined by BibTeX styles rather than by `@string`. */
const BUILTIN_MACROS = new Set([
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

type EntryParseResult =
  | {
      readonly kind: "entry";
      readonly entry: BibliographyEntry;
      readonly nextIndex: number;
      readonly diagnostics: Diagnostic[];
    }
  | { readonly kind: "skipped"; readonly nextIndex: number }
  | { readonly kind: "ignored" }
  | { readonly kind: "malformed"; readonly reason: string };

export function parseBibliography(
  source: string,
  filePath = "bibliography",
): ParsedBibliography {
  const text = source.replace(/\r\n?/g, "\n");
  const entries = new Map<string, BibliographyEntry>();
  const diagnostics: Diagnostic[] = [];
  let index = 0;

  while (index < text.length) {
    const at = text.indexOf("@", index);
    if (at < 0) break;

    const parsed = parseEntry(text, at, filePath);
    if (parsed.kind === "ignored") {
      index = at + 1;
      continue;
    }
    if (parsed.kind === "malformed") {
      diagnostics.push({
        code: "citation-malformed-bibliography",
        severity: "error",
        message: `Malformed bibliography entry in ${filePath}: ${parsed.reason}`,
        filePath,
      });
      index = at + 1;
      continue;
    }

    index = parsed.nextIndex;
    if (parsed.kind === "skipped") continue;

    const { entry } = parsed;
    if (entries.has(entry.key)) {
      diagnostics.push({
        code: "citation-duplicate-key",
        severity: "warning",
        message: `Duplicate bibliography key: ${entry.key}`,
        filePath,
        target: entry.key,
      });
      continue;
    }
    if (!SUPPORTED_TYPES.has(entry.type)) {
      diagnostics.push({
        code: "citation-unsupported-entry-type",
        severity: "warning",
        message:
          `Bibliography entry type "${entry.type}" is not fully supported; ` +
          `"${entry.key}" is rendered with generic fields.`,
        filePath,
        target: entry.key,
      });
    }
    diagnostics.push(...parsed.diagnostics);
    entries.set(entry.key, entry);
  }

  return { entries, diagnostics };
}

function parseEntry(
  text: string,
  start: number,
  filePath: string,
): EntryParseResult {
  const typeMatch = /^@([A-Za-z]+)\s*[{(]/.exec(text.slice(start));
  if (!typeMatch) return { kind: "ignored" };

  const type = typeMatch[1].toLowerCase();
  const bodyStart = start + typeMatch[0].length;
  const close = findEntryClose(text, bodyStart - 1);
  if (close < 0) return { kind: "malformed", reason: "unterminated entry" };

  const body = text.slice(bodyStart, close).trim();
  if (NON_ENTRY_TYPES.has(type)) {
    return { kind: "skipped", nextIndex: close + 1 };
  }

  const comma = findTopLevelComma(body);
  if (comma < 0) {
    return { kind: "malformed", reason: `entry "${type}" has no citation key` };
  }
  const key = body.slice(0, comma).trim();
  if (!key) return { kind: "malformed", reason: "empty citation key" };

  const fields = parseFields(body.slice(comma + 1), key, filePath);
  return {
    kind: "entry",
    entry: { key, type, fields: fields.fields },
    nextIndex: close + 1,
    diagnostics: fields.diagnostics,
  };
}

function findEntryClose(text: string, openIndex: number): number {
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

function findTopLevelComma(input: string): number {
  let braceDepth = 0;
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"' && input[index - 1] !== "\\") {
      quoted = !quoted;
      continue;
    }
    if (quoted) continue;
    if (char === "{") braceDepth += 1;
    else if (char === "}") braceDepth -= 1;
    else if (char === "," && braceDepth <= 0) return index;
  }
  return -1;
}

function parseFields(
  input: string,
  target: string,
  filePath: string,
): { fields: Record<string, string>; diagnostics: Diagnostic[] } {
  const fields: Record<string, string> = {};
  const diagnostics: Diagnostic[] = [];
  let index = 0;

  while (index < input.length) {
    const matcher = /\s*([A-Za-z][A-Za-z0-9_-]*)\s*=\s*/y;
    matcher.lastIndex = index;
    const field = matcher.exec(input);
    if (!field) {
      const rest = input.slice(index).replace(/[\s,]+/g, "");
      if (rest) {
        diagnostics.push(
          unsupportedSyntax(
            `Unexpected text "${rest}" where a field was expected`,
            target,
            filePath,
          ),
        );
      }
      break;
    }

    const name = field[1].toLowerCase();
    const value = readValue(input, matcher.lastIndex);
    fields[name] = cleanValue(value.value);
    if (value.unclosed) {
      diagnostics.push({
        code: "citation-malformed-bibliography",
        severity: "error",
        message:
          `Unclosed ${value.opener === "{" ? "braced" : "quoted"} value ` +
          `for field "${name}" in "${filePath}".`,
        filePath,
        target,
      });
      break;
    }

    let nextIndex = value.nextIndex;
    if (isConcatenation(input, nextIndex)) {
      diagnostics.push(
        unsupportedSyntax(
          `String concatenation in field "${name}" is not supported`,
          target,
          filePath,
        ),
      );
      nextIndex = scanToTopLevelComma(input, nextIndex);
    } else if (isUnresolvedMacro(value)) {
      diagnostics.push(
        unsupportedSyntax(
          `BibTeX macro "${value.value}" in field "${name}" is not expanded and is rendered literally`,
          target,
          filePath,
        ),
      );
    }

    index = nextIndex;
    while (input[index] && /[\s,]/.test(input[index])) index += 1;
  }

  return { fields, diagnostics };
}

type FieldValue = {
  readonly value: string;
  readonly nextIndex: number;
  readonly delimited: boolean;
  readonly unclosed?: boolean;
  readonly opener?: string;
};

function readValue(input: string, start: number): FieldValue {
  const opener = input[start];
  if (opener === "{" || opener === '"') {
    const closer = opener === "{" ? "}" : '"';
    let depth = opener === "{" ? 1 : 0;
    for (let index = start + 1; index < input.length; index += 1) {
      const char = input[index];
      if (opener === "{" && char === "{") depth += 1;
      if (char === closer && input[index - 1] !== "\\") {
        if (opener === '"' || depth === 1) {
          return {
            value: input.slice(start + 1, index),
            nextIndex: index + 1,
            delimited: true,
          };
        }
        depth -= 1;
      }
    }
    return {
      value: input.slice(start + 1),
      nextIndex: input.length,
      delimited: true,
      unclosed: true,
      opener,
    };
  }

  let end = start;
  while (end < input.length && input[end] !== "," && input[end] !== "#") {
    end += 1;
  }
  return {
    value: input.slice(start, end).trim(),
    nextIndex: end,
    delimited: false,
  };
}

function isConcatenation(input: string, from: number): boolean {
  return input.slice(from).trimStart().startsWith("#");
}

function scanToTopLevelComma(input: string, from: number): number {
  let braceDepth = 0;
  let quoted = false;
  for (let index = from; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"' && input[index - 1] !== "\\") {
      quoted = !quoted;
      continue;
    }
    if (quoted) continue;
    if (char === "{") braceDepth += 1;
    else if (char === "}") braceDepth -= 1;
    else if (char === "," && braceDepth <= 0) return index;
  }
  return input.length;
}

function isUnresolvedMacro(value: FieldValue): boolean {
  if (value.delimited) return false;
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(value.value)) return false;
  return !BUILTIN_MACROS.has(value.value.toLowerCase());
}

function unsupportedSyntax(
  message: string,
  target: string,
  filePath: string,
): Diagnostic {
  return {
    code: "citation-unsupported-bibliography-syntax",
    severity: "warning",
    message: `${message} in "${filePath}".`,
    filePath,
    target,
  };
}

function cleanValue(value: string): string {
  return value
    .replace(/[{}]/g, "")
    .replace(/\\([&%$#_{}])/g, "$1")
    .trim();
}
