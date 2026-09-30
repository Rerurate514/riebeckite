import type { WebmentionAuthor, WebmentionType } from "./mention.js";
import { normalizeWebmentionUrl } from "./url.js";

export type ParsedWebmentionLink = Readonly<{
  href: string;
  normalized: string | null;
  rels: readonly string[];
  text: string;
}>;

export type ParsedWebmentionSource = Readonly<{
  title?: string;
  excerpt?: string;
  author?: WebmentionAuthor;
  publishedAt?: string;
  links: readonly ParsedWebmentionLink[];
}>;

const ANCHOR_PATTERN = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
const ATTRIBUTE_PATTERN =
  /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
const META_PATTERN = /<meta\b([^>]*?)\/?>/gi;
const TITLE_PATTERN = /<title\b[^>]*>([\s\S]*?)<\/title>/i;
const TIME_PATTERN = /<time\b([^>]*)>([\s\S]*?)<\/time>/gi;
const PARAGRAPH_PATTERN = /<p\b[^>]*>([\s\S]*?)<\/p>/i;
const H_CARD_PATTERN =
  /<[a-z][a-z0-9-]*\b([^>]*)>([\s\S]*?)<\/[a-z][a-z0-9-]*>/gi;

const MAX_TEXT_LENGTH = 280;

/**
 * Parses the parts of a source document that a Webmention display needs:
 * outbound links (for verification) and lightweight citation metadata. It
 * deliberately does not implement the full microformats2 parser; recognized
 * `rel` values and common meta tags cover the common cases.
 */
export function parseWebmentionSource(
  html: string,
  sourceUrl: string,
): ParsedWebmentionSource {
  const meta = extractMeta(html);
  const title = firstText(
    extractTagText(html, TITLE_PATTERN),
    meta.get("og:title"),
    meta.get("twitter:title"),
  );
  const description = firstText(
    meta.get("description"),
    meta.get("og:description"),
    extractTagText(html, PARAGRAPH_PATTERN),
  );
  const publishedAt = firstText(
    meta.get("article:published_time"),
    meta.get("og:updated_time"),
    extractFirstTime(html),
  );
  const author = extractAuthor(html, sourceUrl, meta);

  return {
    ...(title === undefined ? {} : { title: truncate(title) }),
    ...(description === undefined ? {} : { excerpt: truncate(description) }),
    ...(author === undefined ? {} : { author }),
    ...(publishedAt === undefined ? {} : { publishedAt }),
    links: extractLinks(html, sourceUrl),
  };
}

/** Finds the parsed link that points at the target, if any. */
export function findTargetLink(
  source: ParsedWebmentionSource,
  target: string,
): ParsedWebmentionLink | null {
  const targetKey = normalizeWebmentionUrl(target) ?? target;
  const targetWithoutSlash = targetKey.replace(/\/$/, "");
  for (const link of source.links) {
    if (link.normalized === null) continue;
    const linkWithoutSlash = link.normalized.replace(/\/$/, "");
    if (linkWithoutSlash === targetWithoutSlash) return link;
  }
  return null;
}

/** Maps recognized `rel` values to a Webmention type. */
export function webmentionTypeForRels(rels: readonly string[]): WebmentionType {
  const values = rels.map((rel) => rel.toLowerCase());
  if (values.includes("in-reply-to") || values.includes("reply")) {
    return "reply";
  }
  if (values.includes("repost") || values.includes("reblog")) return "repost";
  if (values.includes("like")) return "like";
  if (values.includes("bookmark")) return "bookmark";
  return "mention";
}

function extractLinks(html: string, sourceUrl: string): ParsedWebmentionLink[] {
  const links: ParsedWebmentionLink[] = [];
  for (const match of html.matchAll(ANCHOR_PATTERN)) {
    const attributes = parseAttributes(match[1] ?? "");
    const href = attributes.get("href");
    if (!href) continue;
    links.push({
      href,
      normalized: resolve(href, sourceUrl),
      rels: (attributes.get("rel") ?? "")
        .split(/\s+/)
        .filter((rel) => rel !== ""),
      text: truncate(stripTags(decodeEntities(match[2] ?? ""))),
    });
  }
  return links;
}

function extractAuthor(
  html: string,
  sourceUrl: string,
  meta: ReadonlyMap<string, string>,
): WebmentionAuthor | undefined {
  const hCard = extractHCard(html, sourceUrl);
  if (hCard) return hCard;

  const name = firstText(meta.get("author"), meta.get("article:author"));
  const url = firstText(meta.get("author:url"), extractAuthorLink(html));
  if (!name && !url) return undefined;
  return {
    ...(name === undefined ? {} : { name: truncate(name) }),
    ...(url === undefined || resolve(url, sourceUrl) === null
      ? {}
      : { url: resolve(url, sourceUrl) as string }),
  };
}

function extractHCard(
  html: string,
  sourceUrl: string,
): WebmentionAuthor | undefined {
  for (const match of html.matchAll(H_CARD_PATTERN)) {
    const classes = parseAttributes(match[1] ?? "").get("class") ?? "";
    if (!/\bh-card\b/.test(classes)) continue;
    const body = match[2] ?? "";
    const name = extractElementText(body, "p-name");
    const url = extractElementAttribute(body, "u-url", "href");
    if (!name && !url) continue;
    return {
      ...(name === undefined ? {} : { name: truncate(name) }),
      ...(url === undefined || resolve(url, sourceUrl) === null
        ? {}
        : { url: resolve(url, sourceUrl) as string }),
    };
  }
  return undefined;
}

function extractElementText(
  html: string,
  classToken: string,
): string | undefined {
  const pattern = new RegExp(
    `<[a-z][a-z0-9-]*\\b[^>]*\\bclass\\s*=\\s*(?:"[^"]*\\b${classToken}\\b[^"]*"|'[^']*\\b${classToken}\\b[^']*')[^>]*>([\\s\\S]*?)</[a-z][a-z0-9-]*>`,
    "i",
  );
  const match = html.match(pattern);
  return match ? stripTags(decodeEntities(match[1] ?? "")) : undefined;
}

function extractElementAttribute(
  html: string,
  classToken: string,
  attribute: string,
): string | undefined {
  const pattern = new RegExp(
    `<[a-z][a-z0-9-]*\\b([^>]*\\bclass\\s*=\\s*(?:"[^"]*\\b${classToken}\\b[^"]*"|'[^']*\\b${classToken}\\b[^']*')[^>]*)>`,
    "i",
  );
  const match = html.match(pattern);
  if (!match) return undefined;
  return parseAttributes(match[1] ?? "").get(attribute);
}

function extractAuthorLink(html: string): string | undefined {
  for (const match of html.matchAll(ANCHOR_PATTERN)) {
    const attributes = parseAttributes(match[1] ?? "");
    const rels = (attributes.get("rel") ?? "").toLowerCase().split(/\s+/);
    if (rels.includes("author")) return attributes.get("href");
  }
  return undefined;
}

function extractMeta(html: string): Map<string, string> {
  const meta = new Map<string, string>();
  for (const match of html.matchAll(META_PATTERN)) {
    const attributes = parseAttributes(match[1] ?? "");
    const key = (
      attributes.get("property") ??
      attributes.get("name") ??
      attributes.get("itemprop") ??
      ""
    ).toLowerCase();
    const content = attributes.get("content");
    if (key && content !== undefined && !meta.has(key)) {
      meta.set(key, content);
    }
  }
  return meta;
}

function extractFirstTime(html: string): string | undefined {
  for (const match of html.matchAll(TIME_PATTERN)) {
    const datetime = parseAttributes(match[1] ?? "").get("datetime");
    const value = datetime ?? stripTags(decodeEntities(match[2] ?? ""));
    if (value) return value;
  }
  return undefined;
}

function extractTagText(html: string, pattern: RegExp): string | undefined {
  const match = html.match(pattern);
  if (!match) return undefined;
  const text = stripTags(decodeEntities(match[1] ?? ""));
  return text === "" ? undefined : text;
}

function parseAttributes(input: string): Map<string, string> {
  const attributes = new Map<string, string>();
  for (const match of input.matchAll(ATTRIBUTE_PATTERN)) {
    const name = (match[1] ?? "").toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    if (name !== "") attributes.set(name, value);
  }
  return attributes;
}

function resolve(value: string, base: string): string | null {
  const decoded = decodeEntities(value.trim());
  if (decoded === "") return null;
  try {
    return normalizeWebmentionUrl(new URL(decoded, base).toString());
  } catch {
    return null;
  }
}

function stripTags(value: string): string {
  return collapseWhitespace(value.replace(/<[^>]*>/g, " "));
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string): string {
  const text = collapseWhitespace(value);
  return text.length <= MAX_TEXT_LENGTH
    ? text
    : `${text.slice(0, MAX_TEXT_LENGTH - 1).trimEnd()}…`;
}

function firstText(
  ...values: readonly (string | undefined)[]
): string | undefined {
  for (const value of values) {
    if (value !== undefined && value.trim() !== "") return value;
  }
  return undefined;
}

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (entity, body) => {
    if (body.startsWith("#")) {
      const isHex = body[1] === "x" || body[1] === "X";
      const code = Number.parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (Number.isFinite(code) && code > 0 && code <= 0x10ffff) {
        return String.fromCodePoint(code);
      }
      return entity;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
  });
}
