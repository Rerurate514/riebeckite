import type { ContentManifestEntry } from "@riebeckite/core";
import { escapeRegExp } from "@riebeckite/core";
import { DEFAULT_SLUG_DATE_FORMAT } from "./daily_notes_types.js";

/**
 * Matches a manifest slug against the configured Daily Notes location. The
 * directory is a fast prefix filter; `pathPattern` refines it when present.
 */
export function isDailyNoteSlug(
  slug: string,
  directory: string,
  pathPattern?: string,
): boolean {
  if (directory.length > 0) {
    const prefix = `${directory}/`;
    if (slug !== directory && !slug.startsWith(prefix)) return false;
  }

  if (pathPattern === undefined) return true;
  return matchesSlugPattern(slug, pathPattern);
}

function matchesSlugPattern(slug: string, pattern: string): boolean {
  return new RegExp(`^${toSlugPatternSource(pattern)}$`).test(slug);
}

function toSlugPatternSource(pattern: string): string {
  let source = "";

  for (let index = 0; index < pattern.length; index++) {
    const character = pattern[index];

    if (character === "{") {
      const end = pattern.indexOf("}", index + 1);
      if (end !== -1) {
        source += placeholderSource(pattern.slice(index + 1, end));
        index = end;
        continue;
      }
    }

    if (character === "*") {
      source += "[^/]*";
      continue;
    }

    source += escapeRegExp(character);
  }

  return source;
}

function placeholderSource(token: string): string {
  if (token === "YYYY") return "\\d{4}";
  if (token === "MM" || token === "DD") return "\\d{2}";
  return "[^/]+";
}

/**
 * Extracts exactly one snippet using the first successful strategy. Returns
 * `null` when every strategy fails; callers must skip the note rather than
 * fall back to the whole note body.
 */

/**
 * Derives the note date deterministically: frontmatter `date`, then `created`,
 * then the note filename parsed with the configured Obsidian date format.
 * Never reads the clock.
 */
export function resolveDailyNoteDate(
  entry: ContentManifestEntry,
  slugDateFormat: string = DEFAULT_SLUG_DATE_FORMAT,
): string {
  const fromFrontmatter =
    normalizeDateValue(entry.frontmatter.date) ??
    normalizeDateValue(entry.frontmatter.created);
  if (fromFrontmatter !== null) return fromFrontmatter;

  return matchSlugDate(entry.slug, slugDateFormat) ?? "";
}

const SLUG_DATE_TOKEN_SOURCES: Record<string, string> = {
  YYYY: "\\d{4}",
  YY: "\\d{2}",
  MM: "\\d{2}",
  M: "\\d{1,2}",
  DD: "\\d{2}",
  D: "\\d{1,2}",
};

const SLUG_DATE_TOKEN_FIELDS: Record<string, "year" | "month" | "day"> = {
  YYYY: "year",
  YY: "year",
  MM: "month",
  M: "month",
  DD: "day",
  D: "day",
};

function matchSlugDate(slug: string, format: string): string | null {
  const matcher = compileSlugDateFormat(format);
  if (matcher === null) return null;

  const match = matcher.exec(slug);
  if (match?.groups === undefined) return null;

  const year = resolveSlugDateYear(match.groups);
  const month = Number(match.groups.month);
  const day = Number(match.groups.day);
  if (year === null) return null;

  return formatDate(year, month, day);
}

function resolveSlugDateYear(
  groups: Readonly<Record<string, string | undefined>>,
): number | null {
  if (groups.year !== undefined) {
    const year = Number(groups.year);
    return Number.isInteger(year) ? year : null;
  }

  if (groups.yearShort !== undefined) {
    const value = Number(groups.yearShort);
    if (!Number.isInteger(value)) return null;
    return value < 69 ? 2000 + value : 1900 + value;
  }

  return null;
}

function compileSlugDateFormat(format: string): RegExp | null {
  let source = "";
  const captured = new Set<"year" | "month" | "day">();
  let hasYear = false;
  let hasMonth = false;
  let hasDay = false;
  let index = 0;

  while (index < format.length) {
    const character = format[index];

    if (character === "[") {
      const end = format.indexOf("]", index + 1);
      if (end === -1) return null;
      source += escapeRegExp(format.slice(index + 1, end));
      index = end + 1;
      continue;
    }

    if (/[A-Za-z]/.test(character)) {
      const token = readSlugDateToken(format, index);
      if (token === null) return null;

      const field = SLUG_DATE_TOKEN_FIELDS[token.value];
      const group =
        field === "year" && token.value === "YY" ? "yearShort" : field;
      if (captured.has(field)) {
        source += `(?:${SLUG_DATE_TOKEN_SOURCES[token.value]})`;
      } else {
        captured.add(field);
        source += `(?<${group}>${SLUG_DATE_TOKEN_SOURCES[token.value]})`;
      }

      if (field === "year") hasYear = true;
      if (field === "month") hasMonth = true;
      if (field === "day") hasDay = true;
      index = token.end;
      continue;
    }

    source += escapeRegExp(character);
    index += 1;
  }

  if (!hasYear || !hasMonth || !hasDay) return null;
  return new RegExp(source);
}

function readSlugDateToken(
  format: string,
  start: number,
): { value: string; end: number } | null {
  const character = format[start];
  let end = start;
  while (end < format.length && format[end] === character) end += 1;
  const run = format.slice(start, end);

  if (character === "Y" && (run === "YYYY" || run === "YY")) {
    return { value: run, end };
  }
  if (
    (character === "M" || character === "D") &&
    (run === "M" || run === "MM" || run === "D" || run === "DD")
  ) {
    return { value: run, end };
  }

  return null;
}

const DATE_PATTERN = /(\d{4})-(\d{1,2})-(\d{1,2})/;

function normalizeDateValue(value: unknown): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return formatDate(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      value.getUTCDate(),
    );
  }

  if (typeof value === "string") return matchDate(value);
  return null;
}

function matchDate(value: string): string | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  return formatDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

function formatDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const paddedYear = year.toString().padStart(4, "0");
  const paddedMonth = month.toString().padStart(2, "0");
  const paddedDay = day.toString().padStart(2, "0");
  return `${paddedYear}-${paddedMonth}-${paddedDay}`;
}
