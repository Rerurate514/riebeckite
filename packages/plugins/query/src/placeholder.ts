/**
 * Build-time placeholder that stands in for a `query` code block until the
 * manifest (and therefore every entry's frontmatter, tags, and permalink) is
 * available.
 *
 * The block source is URI-encoded so it survives an HTML attribute round-trip
 * through `rehype-raw` / `rehype-format` without quoting hazards. The attribute
 * is removed when the plugin replaces the placeholder with rendered HTML, so it
 * never reaches the published page.
 */
export const QUERY_ATTRIBUTE = "data-rr-query";

export function encodeQuerySpec(source: string): string {
  return encodeURIComponent(source);
}

export function decodeQuerySpec(encoded: string): string {
  return decodeURIComponent(encoded);
}

export function createQueryPlaceholder(source: string): string {
  return `<div ${QUERY_ATTRIBUTE}="${encodeQuerySpec(source)}"></div>`;
}

/** A fresh global pattern is returned per call to avoid shared `lastIndex`. */
export function createQueryPlaceholderPattern(): RegExp {
  return new RegExp(
    `<div\\b[^>]*\\b${QUERY_ATTRIBUTE}="([^"]*)"[^>]*>\\s*</div>`,
    "g",
  );
}
