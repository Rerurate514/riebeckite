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
  const prefix = classPrefix(deck);
  const order = cards.map((_card, index) => index);
  if (deck.dataset.flashcardsShuffle === "true") shuffleOrder(order);

  const state = { position: 0, revealed: false };
  const ui = createDeckUi(deck.ownerDocument, prefix);
  ui.root.tabIndex = 0;

  const render = () => {
    const card = cards[order[state.position]];
    if (!card) return;
    ui.question.textContent = card.front;
    ui.answer.textContent = card.back;
    ui.answer.hidden = !state.revealed;
    ui.reveal.textContent = state.revealed ? "Hide answer" : "Show answer";
    ui.reveal.setAttribute("aria-pressed", state.revealed ? "true" : "false");
    ui.counter.textContent = `${state.position + 1} / ${cards.length}`;
  };

  const toggle = () => {
    state.revealed = !state.revealed;
    render();
  };

  const move = (delta: number) => {
    const total = order.length;
    state.position = (state.position + delta + total) % total;
    state.revealed = false;
    render();
  };

  const handleReveal = () => toggle();
  const handlePrev = () => move(-1);
  const handleNext = () => move(1);
  const handleShuffle = () => {
    shuffleOrder(order);
    state.position = 0;
    state.revealed = false;
    render();
  };
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      handleNext();
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      handlePrev();
      return;
    }
    if (event.key === " " || event.key === "Spacebar") {
      if (event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      toggle();
    }
  };

  ui.reveal.addEventListener("click", handleReveal);
  ui.prev.addEventListener("click", handlePrev);
  ui.next.addEventListener("click", handleNext);
  ui.shuffle.addEventListener("click", handleShuffle);
  ui.root.addEventListener("keydown", handleKeyDown);

  const fallback = deck.querySelector<HTMLElement>(FALLBACK_SELECTOR);
  deck.insertBefore(ui.root, fallback ?? null);
  if (fallback) fallback.hidden = true;
  deck.dataset.flashcards = "ready";
  render();

  return () => {
    ui.reveal.removeEventListener("click", handleReveal);
    ui.prev.removeEventListener("click", handlePrev);
    ui.next.removeEventListener("click", handleNext);
    ui.shuffle.removeEventListener("click", handleShuffle);
    ui.root.removeEventListener("keydown", handleKeyDown);
    ui.root.remove();
    if (fallback) fallback.hidden = false;
    delete deck.dataset.flashcards;
  };
}

type DeckUi = {
  root: HTMLElement;
  counter: HTMLElement;
  question: HTMLElement;
  answer: HTMLElement;
  reveal: HTMLButtonElement;
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
  shuffle: HTMLButtonElement;
};

function createDeckUi(doc: Document, prefix: string): DeckUi {
  const root = doc.createElement("div");
  root.className = `${prefix}__deck`;
  root.setAttribute("role", "group");
  root.setAttribute("aria-label", "Flashcards");

  const counter = doc.createElement("p");
  counter.className = `${prefix}__counter`;
  counter.setAttribute("aria-live", "polite");

  const card = doc.createElement("div");
  card.className = `${prefix}__card`;

  const question = doc.createElement("p");
  question.className = `${prefix}__question`;

  const answer = doc.createElement("p");
  answer.className = `${prefix}__answer`;
  answer.hidden = true;

  card.appendChild(question);
  card.appendChild(answer);

  const controls = doc.createElement("div");
  controls.className = `${prefix}__controls`;

  const prev = createButton(doc, prefix, "prev", "Previous card");
  const reveal = createButton(doc, prefix, "reveal", "Show answer");
  const next = createButton(doc, prefix, "next", "Next card");
  const shuffle = createButton(doc, prefix, "shuffle", "Shuffle cards");
  reveal.setAttribute("aria-pressed", "false");

  controls.appendChild(prev);
  controls.appendChild(reveal);
  controls.appendChild(next);
  controls.appendChild(shuffle);
  root.appendChild(counter);
  root.appendChild(card);
  root.appendChild(controls);

  return { root, counter, question, answer, reveal, prev, next, shuffle };
}

function createButton(
  doc: Document,
  prefix: string,
  action: string,
  label: string,
): HTMLButtonElement {
  const button = doc.createElement("button");
  button.type = "button";
  button.className = `${prefix}__button`;
  button.dataset.flashcardsAction = action;
  button.textContent = label;
  return button;
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

function shuffleOrder(order: number[]): void {
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = order[index];
    order[index] = order[swap];
    order[swap] = current;
  }
}
