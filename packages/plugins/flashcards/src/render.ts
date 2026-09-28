import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import type {
  FlashcardsCard,
  FlashcardsPayload,
  ResolvedFlashcardsOptions,
} from "./types.js";

export function renderFlashcards(
  cards: readonly FlashcardsCard[],
  options: ResolvedFlashcardsOptions,
): string {
  const { className } = options;
  const attributes = [
    `class="${escapeHtmlAttribute(className)}"`,
    "data-flashcards",
    `data-flashcards-count="${cards.length}"`,
  ];
  if (options.shuffle) {
    attributes.push('data-flashcards-shuffle="true"');
  }

  const children = [renderFlashcardsPayload(cards)];
  if (options.fallback) {
    children.push(renderFlashcardsFallback(cards, className));
  }

  return `<div ${attributes.join(" ")}>${children.join("")}</div>`;
}

export function renderFlashcardsPayload(
  cards: readonly FlashcardsCard[],
): string {
  const payload: FlashcardsPayload = { cards: [...cards] };
  return `<script type="application/json" data-flashcards-payload>${escapeJsonForScript(JSON.stringify(payload))}</script>`;
}

export function renderFlashcardsFallback(
  cards: readonly FlashcardsCard[],
  className = "rb-flashcards",
): string {
  const items = cards
    .map((card) => renderFallbackItem(card, className))
    .join("");
  return `<ol class="${escapeHtmlAttribute(className)}__list" data-flashcards-fallback>${items}</ol>`;
}

function renderFallbackItem(card: FlashcardsCard, className: string): string {
  const front = escapeHtml(card.front).replace(/\n/g, "<br>");
  const back = escapeHtml(card.back).replace(/\n/g, "<br>");
  return [
    `<li class="${escapeHtmlAttribute(className)}__item">`,
    `<span class="${escapeHtmlAttribute(className)}__front">${front}</span>`,
    `<span class="${escapeHtmlAttribute(className)}__back">${back}</span>`,
    "</li>",
  ].join("");
}

function escapeJsonForScript(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
