import type { FlashcardsCard, FlashcardsParseResult } from "./types.js";

const SEPARATOR_LINE = /^[ \t]*-{3,}[ \t]*$/gm;
const GROUP_BREAK = /\n[ \t]*\n/;
const CARD_DELIMITER = "::";

export function parseFlashcards(source: string): FlashcardsParseResult {
  const groups = splitFlashcardGroups(source);
  if (groups.length === 0) {
    return { ok: false, reason: "is empty" };
  }

  const cards: FlashcardsCard[] = [];
  for (const group of groups) {
    const parsed = parseCard(group);
    if (typeof parsed === "string") {
      return { ok: false, reason: parsed };
    }
    cards.push(parsed);
  }

  return { ok: true, cards };
}

export function splitFlashcardGroups(source: string): string[] {
  return source
    .replace(/\r\n?/g, "\n")
    .replace(SEPARATOR_LINE, "")
    .split(GROUP_BREAK)
    .map((group) => group.trim())
    .filter((group) => group.length > 0);
}

function parseCard(group: string): FlashcardsCard | string {
  const delimiter = group.indexOf(CARD_DELIMITER);
  if (delimiter < 0) {
    return 'has a card without the "::" separator';
  }

  const front = group.slice(0, delimiter).trim();
  const back = group.slice(delimiter + CARD_DELIMITER.length).trim();
  if (front.length === 0 || back.length === 0) {
    return "has a card with an empty question or answer";
  }

  return { front, back };
}
