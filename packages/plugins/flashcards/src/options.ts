import type { FlashcardsOptions, ResolvedFlashcardsOptions } from "./types.js";

export const DEFAULT_FLASHCARDS_CLASS = "rb-flashcards";
export const DEFAULT_FLASHCARDS_LANGUAGE = "flashcards";

export function resolveFlashcardsOptions(
  options: FlashcardsOptions = {},
): ResolvedFlashcardsOptions {
  return {
    className: options.className ?? DEFAULT_FLASHCARDS_CLASS,
    language: options.language ?? DEFAULT_FLASHCARDS_LANGUAGE,
    shuffle: options.shuffle ?? false,
    fallback: options.fallback ?? true,
  };
}
