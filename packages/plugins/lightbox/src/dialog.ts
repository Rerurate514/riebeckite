export function createDialog() {
  const element = document.createElement("div");
  element.className = "rr-lightbox";
  element.setAttribute("role", "dialog");
  element.setAttribute("aria-modal", "true");
  element.setAttribute("aria-label", "画像の拡大表示");
  element.setAttribute("hidden", "");

  const frame = document.createElement("figure");
  frame.className = "rr-lightbox__frame";

  const image = document.createElement("img");
  image.className = "rr-lightbox__image";
  image.decoding = "async";

  const caption = document.createElement("figcaption");
  caption.className = "rr-lightbox__caption";

  const closeButton = document.createElement("button");
  closeButton.className = "rr-lightbox__close";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "閉じる");
  closeButton.textContent = "×";

  frame.appendChild(image);
  frame.appendChild(caption);
  element.appendChild(frame);
  element.appendChild(closeButton);

  return { element, image, caption, closeButton };
}
