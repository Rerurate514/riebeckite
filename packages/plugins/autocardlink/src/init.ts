const CARD_CLASS = "rr-cardlink";
const IMAGE_CLASS = "rr-cardlink__image";

export type AutoCardLinkLayoutOptions = {
  cardClass?: string;
  imageClass?: string;
};

export function initAutoCardLink(
  root: ParentNode = document,
  options: AutoCardLinkLayoutOptions = {},
): () => void {
  const cardClass = options.cardClass ?? CARD_CLASS;
  const imageClass = options.imageClass ?? IMAGE_CLASS;
  const cards = Array.from(root.querySelectorAll<HTMLElement>(`.${cardClass}`));
  const pending: { image: HTMLImageElement; onError: () => void }[] = [];

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

  return () => {
    for (const { image, onError } of pending) {
      image.removeEventListener("error", onError);
    }
  };
}

function showImageFallback(
  card: HTMLElement,
  image: HTMLImageElement,
  cardClass: string,
): void {
  card.classList.add(`${cardClass}--no-image`);
  image.closest(`.${cardClass}__image-frame`)?.remove();
}
