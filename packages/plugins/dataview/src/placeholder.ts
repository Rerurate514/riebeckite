export const DATAVIEW_ATTRIBUTE = "data-rr-dataview";

export function encodeDataviewSource(source: string): string {
  return encodeURIComponent(source);
}

export function decodeDataviewSource(encoded: string): string {
  return decodeURIComponent(encoded);
}

export function createDataviewPlaceholder(source: string): string {
  return `<div ${DATAVIEW_ATTRIBUTE}="${encodeDataviewSource(source)}"></div>`;
}

export function createDataviewPlaceholderPattern(): RegExp {
  return new RegExp(
    `<div\\b[^>]*\\b${DATAVIEW_ATTRIBUTE}="([^"]*)"[^>]*>\\s*</div>`,
    "g",
  );
}
