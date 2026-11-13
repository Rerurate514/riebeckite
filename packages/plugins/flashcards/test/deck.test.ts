import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import { FlashcardsDeck } from "../src/deck.js";
import type { FlashcardsCard } from "../src/types.js";

const cards: FlashcardsCard[] = [
  { front: "Capital of France?", back: "Paris" },
  { front: "Capital of Japan?", back: "Tokyo" },
];

function render(): string {
  return renderToString(
    FlashcardsDeck({ cards, prefix: "rb-flashcards", shuffle: false }),
  );
}

test("renders the first card with the deck controls", () => {
  const html = render();
  assert.match(html, /class="rb-flashcards__deck"/);
  assert.match(html, /role="group"/);
  assert.match(html, /aria-label="Flashcards"/);
  assert.match(html, /tabindex="0"/);
  assert.match(html, /1 \/ 2/);
  assert.match(html, /Capital of France\?/);
  assert.match(html, /Paris/);
  assert.match(html, /data-flashcards-action="prev"/);
  assert.match(html, /data-flashcards-action="reveal"/);
  assert.match(html, /data-flashcards-action="next"/);
  assert.match(html, /data-flashcards-action="shuffle"/);
  assert.match(html, /aria-pressed="false"/);
});

test("keeps the answer hidden until revealed", () => {
  const html = render();
  assert.match(html, /class="rb-flashcards__answer" hidden/);
});
