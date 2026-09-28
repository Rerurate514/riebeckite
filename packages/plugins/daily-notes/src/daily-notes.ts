import type { ContentManifestEntry } from "@riebeckite/core";

export type DailyNote = {
  date: string;
  snippet: string;
  slug: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
};

export type DailyNotesOptions = {
  source?: {
    /** Slug prefix that holds Daily Notes. Defaults to `"Daily"`. */
    directory?: string;
    /** Optional slug template (for example `"Daily/{YYYY}-{MM}-{DD}"`). */
    pathPattern?: string;
  };
  extract?: {
    /** Frontmatter key to read the snippet from. Defaults to `"daily-summary"`. */
    frontmatter?: string | false;
    /** Heading whose section becomes the snippet. Defaults to `"今日のひとこと"`. */
    section?: string | false;
    /** Code block language to read the snippet from. Defaults to `"daily-snippet"`. */
    codeBlock?: string | false;
  };
  widget?: {
    /** Maximum number of notes to surface. Defaults to `5`. */
    limit?: number;
  };
};

export type ResolvedDailyNotesExtract = {
  frontmatter: string | false;
  section: string | false;
  codeBlock: string | false;
};

export const DEFAULT_DIRECTORY = "Daily";
export const DEFAULT_FRONTMATTER_KEY = "daily-summary";
export const DEFAULT_SECTION = "今日のひとこと";
export const DEFAULT_CODE_BLOCK = "daily-snippet";
export const DEFAULT_LIMIT = 5;

export function resolveExtractOptions(
  options: DailyNotesOptions | undefined,
): ResolvedDailyNotesExtract {
  const extract = options?.extract;

  return {
    frontmatter:
      extract?.frontmatter === undefined
        ? DEFAULT_FRONTMATTER_KEY
        : extract.frontmatter,
    section: extract?.section === undefined ? DEFAULT_SECTION : extract.section,
    codeBlock:
      extract?.codeBlock === undefined ? DEFAULT_CODE_BLOCK : extract.codeBlock,
  };
}

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

export function matchesSlugPattern(slug: string, pattern: string): boolean {
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extracts exactly one snippet using the first successful strategy. Returns
 * `null` when every strategy fails; callers must skip the note rather than
 * fall back to the whole note body.
 */
export function extractDailyNoteSnippet(
  entry: ContentManifestEntry,
  extract: ResolvedDailyNotesExtract,
): string | null {
  if (extract.frontmatter !== false) {
    const value = entry.frontmatter[extract.frontmatter];
    const text = typeof value === "string" ? value.trim() : "";
    if (text.length > 0) return text;
  }

  if (extract.section !== false) {
    const text = extractSectionSnippet(entry.html, extract.section);
    if (text !== null) return text;
  }

  if (extract.codeBlock !== false) {
    const text = extractCodeBlockSnippet(entry.html, extract.codeBlock);
    if (text !== null) return text;
  }

  return null;
}

const HEADING_PATTERN = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g;

export function extractSectionSnippet(
  html: string,
  section: string,
): string | null {
  const headings = [...html.matchAll(HEADING_PATTERN)].map((match) => {
    const start = match.index ?? 0;
    return {
      level: Number(match[1]),
      title: decodeHtmlEntities(stripHtml(match[2])).trim(),
      start,
      end: start + match[0].length,
    };
  });

  const target = headings.find((heading) => heading.title === section);
  if (!target) return null;

  const boundary = headings.find(
    (heading) => heading.start >= target.end && heading.level <= target.level,
  );
  const body = html.slice(target.end, boundary?.start ?? html.length);
  const text = collapseWhitespace(decodeHtmlEntities(stripHtml(body)));

  return text.length > 0 ? text : null;
}

const CODE_BLOCK_PATTERN = /<code\b([^>]*)>([\s\S]*?)<\/code>/g;

export function extractCodeBlockSnippet(
  html: string,
  language: string,
): string | null {
  const wanted = `language-${language}`;

  for (const match of html.matchAll(CODE_BLOCK_PATTERN)) {
    const classAttribute = match[1].match(/\bclass="([^"]*)"/)?.[1] ?? "";
    if (!classAttribute.split(/\s+/).includes(wanted)) continue;

    const text = decodeHtmlEntities(stripHtml(match[2])).trim();
    if (text.length > 0) return text;
  }

  return null;
}

/**
 * Derives the note date deterministically: frontmatter `date`, then `created`,
 * then a `YYYY-MM-DD` sequence in the slug. Never reads the clock.
 */
export function resolveDailyNoteDate(entry: ContentManifestEntry): string {
  const fromFrontmatter =
    normalizeDateValue(entry.frontmatter.date) ??
    normalizeDateValue(entry.frontmatter.created);
  if (fromFrontmatter !== null) return fromFrontmatter;

  return matchDate(entry.slug) ?? "";
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

/** Newest first, then slug ascending. Notes without a date sort last. */
export function compareDailyNotes(a: DailyNote, b: DailyNote): number {
  if (a.date !== b.date) {
    if (a.date.length === 0) return 1;
    if (b.date.length === 0) return -1;
    return a.date < b.date ? 1 : -1;
  }

  if (a.slug === b.slug) return 0;
  return a.slug < b.slug ? -1 : 1;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(text: string): string {
  return text.replace(
    /&(#[xX]?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g,
    (match, entity: string) => {
      switch (entity) {
        case "amp":
          return "&";
        case "lt":
          return "<";
        case "gt":
          return ">";
        case "quot":
          return '"';
        case "apos":
          return "'";
        case "nbsp":
          return " ";
        default:
          return decodeNumericEntity(match, entity);
      }
    },
  );
}

function decodeNumericEntity(match: string, entity: string): string {
  if (entity.startsWith("#x") || entity.startsWith("#X")) {
    return fromCodePoint(match, Number.parseInt(entity.slice(2), 16));
  }
  if (entity.startsWith("#")) {
    return fromCodePoint(match, Number.parseInt(entity.slice(1), 10));
  }
  return match;
}

function fromCodePoint(match: string, code: number): string {
  if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return match;
  return String.fromCodePoint(code);
}
