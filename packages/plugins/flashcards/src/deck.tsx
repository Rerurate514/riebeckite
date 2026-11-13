/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { useState } from "hono/jsx";
import { createRoot } from "hono/jsx/dom/client";
import type { FlashcardsCard } from "./types.js";

export type FlashcardsDeckProps = {
  cards: readonly FlashcardsCard[];
  prefix: string;
  shuffle: boolean;
};

export function FlashcardsDeck({
  cards,
  prefix,
  shuffle,
}: FlashcardsDeckProps) {
  const [order, setOrder] = useState(() => createOrder(cards.length, shuffle));
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const card = cards[order[position]];

  const move = (delta: number) => {
    setPosition((current) => (current + delta + order.length) % order.length);
    setRevealed(false);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
      return;
    }
    if (event.key === " " || event.key === "Spacebar") {
      if (event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      setRevealed((value) => !value);
    }
  };

  if (!card) return null;

  return (
    // biome-ignore lint/a11y/useSemanticElements: Keep the existing div-based deck markup and styling.
    <div
      class={`${prefix}__deck`}
      role="group"
      aria-label="Flashcards"
      tabindex={0}
      onKeyDown={handleKeyDown}
    >
      <p class={`${prefix}__counter`} aria-live="polite">
        {`${position + 1} / ${cards.length}`}
      </p>
      <div class={`${prefix}__card`}>
        <p class={`${prefix}__question`}>{card.front}</p>
        <p class={`${prefix}__answer`} hidden={!revealed}>
          {card.back}
        </p>
      </div>
      <div class={`${prefix}__controls`}>
        <button
          class={`${prefix}__button`}
          data-flashcards-action="prev"
          type="button"
          onClick={() => move(-1)}
        >
          Previous card
        </button>
        <button
          class={`${prefix}__button`}
          data-flashcards-action="reveal"
          type="button"
          aria-pressed={revealed ? "true" : "false"}
          onClick={() => setRevealed((value) => !value)}
        >
          {revealed ? "Hide answer" : "Show answer"}
        </button>
        <button
          class={`${prefix}__button`}
          data-flashcards-action="next"
          type="button"
          onClick={() => move(1)}
        >
          Next card
        </button>
        <button
          class={`${prefix}__button`}
          data-flashcards-action="shuffle"
          type="button"
          onClick={() => {
            setOrder(shuffleOrder(order));
            setPosition(0);
            setRevealed(false);
          }}
        >
          Shuffle cards
        </button>
      </div>
    </div>
  );
}

export function mountFlashcardsDeck(
  container: HTMLElement,
  props: FlashcardsDeckProps,
): () => void {
  const root = createRoot(container);
  root.render(<FlashcardsDeck {...props} />);
  return () => root.unmount();
}

function createOrder(length: number, shuffle: boolean): number[] {
  const order = Array.from({ length }, (_value, index) => index);
  return shuffle ? shuffleOrder(order) : order;
}

function shuffleOrder(order: readonly number[]): number[] {
  const shuffled = [...order];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[swap];
    shuffled[swap] = current;
  }
  return shuffled;
}
