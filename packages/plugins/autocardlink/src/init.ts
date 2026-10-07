const CARD_CLASS = "rr-cardlink";
const IMAGE_CLASS = "rr-cardlink__image";
const COPY_CLASS = "rr-cardlink__copy";
const COPY_LABEL_CLASS = "rr-cardlink__copy-label";
const COPY_STATUS_TIMEOUT = 1600;

export type AutoCardLinkLayoutOptions = {
  cardClass?: string;
  imageClass?: string;
  copyClass?: string;
};

export function initAutoCardLink(
  root: ParentNode = document,
  options: AutoCardLinkLayoutOptions = {},
): () => void {
  const cardClass = options.cardClass ?? CARD_CLASS;
  const imageClass = options.imageClass ?? IMAGE_CLASS;
  const copyClass = options.copyClass ?? COPY_CLASS;
  const cards = Array.from(root.querySelectorAll<HTMLElement>(`.${cardClass}`));
  const pending: { image: HTMLImageElement; onError: () => void }[] = [];
  const copyHandlers: {
    button: HTMLButtonElement;
    onClick: () => void;
  }[] = [];
  const timers: number[] = [];

  for (const card of cards) {
    const image = card.querySelector<HTMLImageElement>(`.${imageClass}`);
    if (!image) continue;

    if (image.complete) {
      if (image.naturalWidth === 0) showImageFallback(card, image, cardClass);
      continue;
    }

    const onError = () => {
      image.removeEventListener("error", onError);
      showImageFallback(card, image, cardClass);
    };
    image.addEventListener("error", onError);
    pending.push({ image, onError });
  }

  for (const button of root.querySelectorAll<HTMLButtonElement>(
    `[data-rr-cardlink-copy]`,
  )) {
    const url = button.getAttribute("data-rr-cardlink-copy");
    if (!url) continue;

    const onClick = () => {
      void copyUrl(button, url, copyClass, timers);
    };
    button.addEventListener("click", onClick);
    copyHandlers.push({ button, onClick });
  }

  return () => {
    for (const { image, onError } of pending) {
      image.removeEventListener("error", onError);
    }
    for (const { button, onClick } of copyHandlers) {
      button.removeEventListener("click", onClick);
    }
    for (const timer of timers) window.clearTimeout(timer);
  };
}

async function copyUrl(
  button: HTMLButtonElement,
  url: string,
  copyClass: string,
  timers: number[],
): Promise<void> {
  try {
    await navigator.clipboard?.writeText(url);
  } catch {
    return;
  }

  const label = button.querySelector(`.${COPY_LABEL_CLASS}`);
  const original = label?.textContent ?? "Copy URL";
  button.classList.add(`${copyClass}--copied`);
  if (label) label.textContent = "Copied";
  timers.push(
    window.setTimeout(() => {
      button.classList.remove(`${copyClass}--copied`);
      if (label) label.textContent = original;
    }, COPY_STATUS_TIMEOUT),
  );
}

function showImageFallback(
  card: HTMLElement,
  image: HTMLImageElement,
  cardClass: string,
): void {
  card.classList.add(`${cardClass}--no-image`);
  image.closest(`.${cardClass}__image-frame`)?.remove();
}
