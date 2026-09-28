export const FLASHCARDS_ATTRIBUTE = "data-rr-flashcards-spec";

export function encodeFlashcardsSource(source: string): string {
  return encodeURIComponent(source);
}

export function decodeFlashcardsSource(encoded: string): string {
  return decodeURIComponent(encoded);
}

export function createFlashcardsPlaceholder(source: string): string {
  return `<div ${FLASHCARDS_ATTRIBUTE}="${encodeFlashcardsSource(source)}"></div>`;
}

export function createFlashcardsPlaceholderPattern(): RegExp {
  return new RegExp(
    `<div\\b[^>]*\\b${FLASHCARDS_ATTRIBUTE}="([^"]*)"[^>]*>\\s*</div>`,
    "g",
  );
}
