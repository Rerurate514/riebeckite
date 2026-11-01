export const IMAGE_COMPARE_ATTRIBUTE = "data-rr-image-compare-source";

export function encodeImageCompareSource(source: string): string {
  return encodeURIComponent(source);
}

export function decodeImageCompareSource(encoded: string): string {
  return decodeURIComponent(encoded);
}

export function createImageComparePlaceholder(source: string): string {
  return `<div ${IMAGE_COMPARE_ATTRIBUTE}="${encodeImageCompareSource(source)}"></div>`;
}

export function createImageComparePlaceholderPattern(): RegExp {
  return new RegExp(
    `<div\\b[^>]*\\b${IMAGE_COMPARE_ATTRIBUTE}="([^"]*)"[^>]*>\\s*</div>`,
    "g",
  );
}
