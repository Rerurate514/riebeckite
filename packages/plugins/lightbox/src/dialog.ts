export function createDialog(options: {
  expandLabel: string;
  closeLabel: string;
}) {
  const element = document.createElement("dialog");
  element.className = "rr-lightbox";
  element.setAttribute("aria-label", options.expandLabel);

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
  closeButton.setAttribute("aria-label", options.closeLabel);
  closeButton.textContent = "×";

  frame.appendChild(image);
  frame.appendChild(caption);
  element.appendChild(frame);
  element.appendChild(closeButton);

  return { element, image, caption, closeButton };
}
