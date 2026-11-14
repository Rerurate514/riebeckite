import type { ContentManifestEntry } from "@riebeckite/core";
import type { ResolvedDailyNotesExtract } from "./daily_notes_types.js";
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

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function decodeHtmlEntities(text: string): string {
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

export function decodeNumericEntity(match: string, entity: string): string {
  if (entity.startsWith("#x") || entity.startsWith("#X")) {
    return fromCodePoint(match, Number.parseInt(entity.slice(2), 16));
  }
  if (entity.startsWith("#")) {
    return fromCodePoint(match, Number.parseInt(entity.slice(1), 10));
  }
  return match;
}

export function fromCodePoint(match: string, code: number): string {
  if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return match;
  return String.fromCodePoint(code);
}
