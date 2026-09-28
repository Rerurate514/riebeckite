/**
 * Minimal, dependency-free HTML scanning helpers.
 *
 * This is intentionally *not* a spec-compliant HTML parser. It uses regular
 * expressions to find start tags and their attributes, which is enough for the
 * static quality rules in this package but does not model the DOM. Rules that
 * need identical tag pairing (for example `<a>` text content) only work for
 * well-formed, non-nested markup. See the package README for the limitations.
 */

export type HtmlElement = {
  /** Lowercase tag name. */
  tag: string;
  /** Attributes keyed by lowercase name. The first occurrence wins. */
  attributes: Map<string, string>;
  /** Raw tag text including `<` and `>`. */
  raw: string;
  /** Index of `<` within the scanned document. */
  start: number;
  /** Index just past the closing `>`. */
  end: number;
  /** Inner HTML between the open and close tags. Empty for void elements. */
  content: string;
};

const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

const TAG_PATTERN =
  /<([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;

const ATTRIBUTE_PATTERN =
  /([^\s"'=<>`/]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

/**
 * Replaces comments and the contents of `<script>`/`<style>` elements with
 * spaces of the same length so byte offsets stay aligned with the original
 * document. This keeps code samples from producing phantom attribute matches.
 */
export function maskIgnoredRegions(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, (match) => " ".repeat(match.length))
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, (match) =>
      " ".repeat(match.length),
    );
}

/**
 * Scans start tags in document order. Tags inside masked regions are already
 * removed by {@link maskIgnoredRegions}.
 */
export function scanElements(document: string): HtmlElement[] {
  const elements: HtmlElement[] = [];
  const pattern = new RegExp(TAG_PATTERN.source, "g");
  for (const match of document.matchAll(pattern)) {
    const tag = (match[1] ?? "").toLowerCase();
    const selfClosing = match[3] === "/" || VOID_ELEMENTS.has(tag);
    const end = match.index + match[0].length;
    elements.push({
      tag,
      attributes: parseAttributes(match[2] ?? ""),
      raw: match[0],
      start: match.index,
      end,
      content: selfClosing ? "" : innerContent(document, tag, end),
    });
  }
  return elements;
}

/** Parses an attribute list into a lowercase-keyed map. */
export function parseAttributes(text: string): Map<string, string> {
  const attributes = new Map<string, string>();
  const pattern = new RegExp(ATTRIBUTE_PATTERN.source, "g");
  for (const match of text.matchAll(pattern)) {
    const name = (match[1] ?? "").toLowerCase();
    if (attributes.has(name)) continue;
    const value = match[3] ?? match[4] ?? match[5] ?? "";
    attributes.set(name, decodeHtmlEntities(value));
  }
  return attributes;
}

/** Extracts text content, dropping tags and decoding common entities. */
export function textContent(fragment: string): string {
  return decodeHtmlEntities(fragment.replace(/<[^>]*>/g, " "));
}

/** Returns the raw attribute value, or `undefined` when it is absent. */
export function attribute(
  element: HtmlElement,
  name: string,
): string | undefined {
  return element.attributes.get(name);
}

/** True when the attribute is present and its value is not blank. */
export function hasNonEmptyAttribute(
  element: HtmlElement,
  name: string,
): boolean {
  const value = element.attributes.get(name);
  return value !== undefined && value.trim() !== "";
}

/** Decodes a small set of named and numeric HTML entities. */
export function decodeHtmlEntities(value: string): string {
  return value.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (match, entity: string) => {
      if (entity.startsWith("#")) {
        const hex = entity[1] === "x" || entity[1] === "X";
        const code = Number.parseInt(
          hex ? entity.slice(2) : entity.slice(1),
          hex ? 16 : 10,
        );
        if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
        return String.fromCodePoint(code);
      }
      return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
    },
  );
}

function innerContent(document: string, tag: string, from: number): string {
  const pattern = new RegExp(`</${tag}\\s*>`, "gi");
  pattern.lastIndex = from;
  const match = pattern.exec(document);
  return match ? document.slice(from, match.index) : "";
}
