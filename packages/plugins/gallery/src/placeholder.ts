/**
 * Attribute that carries a fenced `gallery` block from the Markdown pipeline to
 * the manifest stage.
 *
 * The raw block body is URI-encoded so it survives an HTML attribute round-trip
 * through `rehype-raw` without quoting hazards. The placeholder is replaced by
 * the rendered grid before the page is written, at which point the same
 * attribute marks the finished container for styling and tests.
 */
export const GALLERY_ATTRIBUTE = "data-rr-gallery";

export function encodeGallerySource(source: string): string {
  return encodeURIComponent(source);
}

export function decodeGallerySource(encoded: string): string {
  return decodeURIComponent(encoded);
}

export function createGalleryPlaceholder(source: string): string {
  return `<div ${GALLERY_ATTRIBUTE}="${encodeGallerySource(source)}"></div>`;
}

/** A fresh global pattern is returned per call to avoid shared `lastIndex`. */
export function createGalleryPlaceholderPattern(): RegExp {
  return new RegExp(
    `<div\\b[^>]*\\b${GALLERY_ATTRIBUTE}="([^"]*)"[^>]*>\\s*</div>`,
    "g",
  );
}
