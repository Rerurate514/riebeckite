import { splitTopLevel, unquote } from "./parse-shared.js";

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const WHOLE_LINE_FIELD = /^([^\s:|][^:|]*?)::\s*(.*)$/;
const BRACKET_FIELD = /(?<!\[)\[([^[\]\n]+?)::\s*([^[\]\n]*)\]/g;
const PAREN_FIELD = /\(([^()\n]+?)::\s*([^()\n]*)\)/g;
const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

export type InlineFields = Map<string, unknown>;

/**
 * Collects Dataview inline fields from Markdown source.
 *
 * Both `Key:: value` (own line) and `[Key:: value]` / `(Key:: value)` are
 * recognized. Code spans and fenced blocks are skipped, and frontmatter is
 * left to the manifest so inline values can override it like Obsidian does.
 */
export function parseInlineFields(markdown: string): InlineFields {
  const fields: InlineFields = new Map();
  const body = markdown.replace(FRONTMATTER, "");
  let fence: string | null = null;

  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const fenceMatch = /^(`{3,}|~{3,})/.exec(line.trimStart());
    if (fenceMatch) {
      const marker = fenceMatch[1] ?? "";
      if (fence === null) fence = marker[0] ?? null;
      else if (marker[0] === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;

    const masked = maskCodeSpans(line);
    const listItem = /^\s*(?:[-*+]|\d+[.)])\s+/.test(line);
    if (!listItem) {
      collectBracketFields(masked, BRACKET_FIELD, fields);
      collectBracketFields(masked, PAREN_FIELD, fields);
    }

    const trimmed = line.trimStart();
    if (isWholeLineCandidate(trimmed)) {
      const match = WHOLE_LINE_FIELD.exec(trimmed);
      if (match) {
        const key = (match[1] ?? "").trim();
        if (key.length > 0 && !isUrlLike(match[2] ?? "")) {
          setField(fields, key, parseInlineValue(match[2] ?? ""));
        }
      }
    }
  }

  return fields;
}

/** Collects the bracketed and parenthesized inline fields in a text span. */
export function parseInlineFieldText(text: string): InlineFields {
  const fields: InlineFields = new Map();
  const masked = maskCodeSpans(text);
  collectBracketFields(masked, BRACKET_FIELD, fields);
  collectBracketFields(masked, PAREN_FIELD, fields);
  return fields;
}

/** Removes the inline field markup from text the way Obsidian renders it. */
export function stripInlineFieldMarkup(text: string): string {
  return text
    .replace(/(?<!\[)\[[^[\]\n]+?::\s*[^[\]\n]*\]/g, "")
    .replace(/\([^()\n]+?::\s*[^()\n]*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Parses a Dataview metadata value following YAML-like rules. */
export function parseInlineValue(raw: string): unknown {
  const value = raw.trim();
  if (value.length === 0) return "";
  if (value === "null") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (value.startsWith('"') || value.startsWith("'")) {
    return unquote(value);
  }
  if (value.startsWith("[") && value.endsWith("]")) {
    return splitTopLevel(value.slice(1, -1), ",").map(parseInlineValue);
  }
  if (NUMBER.test(value)) return Number(value);
  if (ISO_DATE.test(value)) {
    const time = Date.parse(value);
    if (!Number.isNaN(time)) return new Date(time);
  }
  return value;
}

/** Dataview's queryable form of a field name. */
export function normalizeFieldKey(key: string): string {
  return key
    .replace(/[*_~`]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function collectBracketFields(
  line: string,
  pattern: RegExp,
  fields: InlineFields,
): void {
  pattern.lastIndex = 0;
  for (
    let match = pattern.exec(line);
    match !== null;
    match = pattern.exec(line)
  ) {
    const key = normalizeFieldKey(match[1] ?? "");
    if (key.length === 0) continue;
    setField(fields, (match[1] ?? "").trim(), parseInlineValue(match[2] ?? ""));
  }
}

function setField(fields: InlineFields, rawKey: string, value: unknown): void {
  fields.set(rawKey, value);
  const sanitized = normalizeFieldKey(rawKey);
  if (sanitized !== rawKey) fields.set(sanitized, value);
}

function maskCodeSpans(line: string): string {
  return line.replace(/`+[^`]*`+/g, (span) => " ".repeat(span.length));
}

function isWholeLineCandidate(line: string): boolean {
  if (line.length === 0) return false;
  if (/^([>#|]|[-*+]\s|\d+[.)]\s)/.test(line)) return false;
  return true;
}

function isUrlLike(value: string): boolean {
  return value.trimStart().startsWith("//");
}
