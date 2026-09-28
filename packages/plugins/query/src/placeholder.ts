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

export function createQueryPlaceholderPattern(): RegExp {
  return new RegExp(
    `<div\\b[^>]*\\b${QUERY_ATTRIBUTE}="([^"]*)"[^>]*>\\s*</div>`,
    "g",
  );
}
