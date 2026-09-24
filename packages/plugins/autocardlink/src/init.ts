const CARD_CLASS = "rr-cardlink";
const IMAGE_CLASS = "rr-cardlink__image";

const MEDIA_WIDTH_MIN = 112;
const MEDIA_WIDTH_MAX_FRACTION = 0.38;

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
  const pending: { image: HTMLImageElement; onLoad: () => void }[] = [];

  for (const card of cards) {
    const image = card.querySelector<HTMLImageElement>(`.${imageClass}`);
    if (!image) continue;

    const apply = () => applyImageRatio(card, image, cardClass);

    if (image.complete && image.naturalWidth > 0) {
      apply();
      continue;
    }

    image.addEventListener("load", apply);
    pending.push({ image, onLoad: apply });
  }

  return () => {
    for (const { image, onLoad } of pending) {
      image.removeEventListener("load", onLoad);
    }
  };
}

function applyImageRatio(
  card: HTMLElement,
  image: HTMLImageElement,
  cardClass: string,
): void {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (width === 0 || height === 0) return;

  const aspectRatio = width / height;
  const body = card.querySelector<HTMLElement>(`.${cardClass}__body`);
  const displayHeight = body?.clientHeight ?? image.clientHeight;
  if (displayHeight === 0) return;

  const maxWidth = card.clientWidth * MEDIA_WIDTH_MAX_FRACTION;
  const mediaWidth = clampWidth(displayHeight * aspectRatio, maxWidth);

  card.style.setProperty(
    "--rr-autocardlink-media-width",
    `${mediaWidth.toFixed(0)}px`,
  );
  card.style.setProperty(
    "--rr-autocardlink-image-ratio",
    `${width} / ${height}`,
  );
}

function clampWidth(width: number, maxWidth: number): number {
  return Math.min(maxWidth, Math.max(MEDIA_WIDTH_MIN, width));
}
