export function createDialog(options: {
  expandLabel: string;
  closeLabel: string;
}) {
  const element = document.createElement("dialog");
  element.className = "rr-lightbox";
  element.setAttribute("aria-label", options.expandLabel);

  const frame = document.createElement("figure");
  frame.className = "rr-lightbox__frame";
  frame.dataset.loadingContent = "";

  const status = document.createElement("p");
  status.className = "rr-lightbox__status";
  status.dataset.loading = "";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.textContent = "Loading image…";
  status.hidden = true;

  const error = document.createElement("p");
  error.className = "rr-lightbox__error";
  error.dataset.loadingError = "";
  error.setAttribute("role", "alert");
  error.hidden = true;

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
  element.appendChild(status);
  element.appendChild(error);
  element.appendChild(closeButton);

  return { element, image, caption, closeButton };
}
