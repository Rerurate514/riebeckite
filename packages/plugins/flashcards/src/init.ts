import { mountFlashcardsDeck } from "./deck.js";
import type { FlashcardsCard, FlashcardsPayload } from "./types.js";

const ROOT_SELECTOR = "[data-flashcards]";
const PAYLOAD_SELECTOR = "script[data-flashcards-payload]";
const FALLBACK_SELECTOR = "[data-flashcards-fallback]";
const DEFAULT_CLASS = "rb-flashcards";

export function initFlashcards(root: ParentNode = document): () => void {
  const decks = Array.from(root.querySelectorAll<HTMLElement>(ROOT_SELECTOR));
  const cleanups: Array<() => void> = [];

  for (const deck of decks) {
    const cleanup = initializeDeck(deck);
    if (cleanup) cleanups.push(cleanup);
  }

  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}

function initializeDeck(deck: HTMLElement): (() => void) | null {
  if (deck.dataset.flashcards === "ready") return null;

  let cards: FlashcardsCard[];
  try {
    cards = readCards(deck);
  } catch {
    return null;
  }
  if (cards.length === 0) return null;

  try {
    return buildDeck(deck, cards);
  } catch {
    return null;
  }
}

function buildDeck(deck: HTMLElement, cards: FlashcardsCard[]): () => void {
  const fallback = deck.querySelector<HTMLElement>(FALLBACK_SELECTOR);
  const container = deck.ownerDocument.createElement("div");
  deck.insertBefore(container, fallback ?? null);

  let unmount: () => void;
  try {
    unmount = mountFlashcardsDeck(container, {
      cards,
      prefix: classPrefix(deck),
      shuffle: deck.dataset.flashcardsShuffle === "true",
    });
  } catch (error) {
    container.remove();
    throw error;
  }

  if (fallback) fallback.hidden = true;
  deck.dataset.flashcards = "ready";

  return () => {
    unmount();
    container.remove();
    if (fallback) fallback.hidden = false;
    delete deck.dataset.flashcards;
  };
}

function readCards(deck: HTMLElement): FlashcardsCard[] {
  const script = deck.querySelector<HTMLScriptElement>(PAYLOAD_SELECTOR);
  if (!script) throw new Error("Missing flashcards payload");
  return parsePayload(script.textContent ?? "").cards;
}

function parsePayload(raw: string): FlashcardsPayload {
  const parsed: unknown = JSON.parse(raw);
  if (!isPayload(parsed)) throw new Error("Invalid flashcards payload");
  return parsed;
}

function isPayload(value: unknown): value is FlashcardsPayload {
  if (!value || typeof value !== "object") return false;
  const cards = (value as { cards?: unknown }).cards;
  return Array.isArray(cards) && cards.every(isCard);
}

function isCard(value: unknown): value is FlashcardsCard {
  if (!value || typeof value !== "object") return false;
  const card = value as { front?: unknown; back?: unknown };
  return typeof card.front === "string" && typeof card.back === "string";
}

function classPrefix(deck: HTMLElement): string {
  for (const name of deck.className.split(/\s+/)) {
    if (name.length > 0) return name;
  }
  return DEFAULT_CLASS;
}
