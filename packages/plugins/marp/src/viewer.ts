const FIGURE_SELECTOR = "figure[data-marp]";
const DECK_SELECTOR = ":scope > div";
const COUNTER_SEPARATOR = " / ";

/**
 * Turns rendered decks into one-slide-at-a-time viewers.
 *
 * Without JavaScript every slide stays visible in a vertical stack, so the
 * viewer is a progressive enhancement rather than a requirement.
 */
export function initMarpDecks(): void {
  if (typeof document === "undefined") return;

  for (const figure of document.querySelectorAll<HTMLElement>(
    FIGURE_SELECTOR,
  )) {
    if (figure.dataset.marpViewer !== undefined) continue;
    const deck = figure.querySelector<HTMLElement>(DECK_SELECTOR);
    if (!deck) continue;
    const slides = Array.from(deck.children);
    if (slides.length < 2) continue;
    mountViewer(figure, deck, slides);
  }
}

function mountViewer(
  figure: HTMLElement,
  deck: HTMLElement,
  slides: Element[],
): void {
  figure.dataset.marpViewer = "";
  figure.tabIndex = 0;

  const controls = document.createElement("div");
  controls.className = "rb-marp__controls";

  const previous = createButton("Previous slide", "\u2190");
  const next = createButton("Next slide", "\u2192");
  const counter = document.createElement("span");
  counter.className = "rb-marp__counter";
  counter.setAttribute("aria-live", "polite");

  controls.append(previous, next, counter);

  if (typeof figure.requestFullscreen === "function") {
    const fullscreen = createButton("Fullscreen", "\u26f6");
    fullscreen.addEventListener("click", () => {
      if (document.fullscreenElement === figure) {
        void document.exitFullscreen();
        return;
      }
      void figure.requestFullscreen();
    });
    figure.addEventListener("fullscreenchange", () => {
      fullscreen.setAttribute(
        "aria-label",
        document.fullscreenElement === figure
          ? "Exit fullscreen"
          : "Fullscreen",
      );
    });
    controls.append(fullscreen);
  }

  deck.after(controls);

  let index = 0;

  const show = (target: number): void => {
    index = Math.min(Math.max(target, 0), slides.length - 1);
    slides.forEach((slide, slideIndex) => {
      if (slideIndex === index) slide.removeAttribute("hidden");
      else slide.setAttribute("hidden", "");
    });
    counter.textContent = `${index + 1}${COUNTER_SEPARATOR}${slides.length}`;
    previous.disabled = index === 0;
    next.disabled = index === slides.length - 1;
  };

  previous.addEventListener("click", () => show(index - 1));
  next.addEventListener("click", () => show(index + 1));
  figure.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      show(index - 1);
    } else if (event.key === "ArrowRight" || event.key === "PageDown") {
      event.preventDefault();
      show(index + 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      show(0);
    } else if (event.key === "End") {
      event.preventDefault();
      show(slides.length - 1);
    }
  });

  show(0);
}

function createButton(label: string, glyph: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "rb-marp__control";
  button.setAttribute("aria-label", label);
  button.textContent = glyph;
  return button;
}
