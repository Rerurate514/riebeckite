import { createDialog } from "./dialog";
import { DEFAULT_TRIGGER_CLASS, type LightboxInitOptions } from "./types";

export function initLightbox(
  root: ParentNode = document,
  options: LightboxInitOptions = {},
): () => void {
  const triggerClass = options.selectorClass ?? DEFAULT_TRIGGER_CLASS;
  const wrappedTriggers =
    options.autoWrapImages === false ? [] : wrapImages(root, triggerClass);
  const triggers = Array.from(
    root.querySelectorAll<HTMLAnchorElement>(`.${triggerClass}`),
  );
  if (triggers.length === 0) {
    return () => {
      for (const trigger of wrappedTriggers) unwrapImage(trigger);
    };
  }

  let previouslyFocused: HTMLElement | null = null;
  const dialog = createDialog();
  document.body.appendChild(dialog.element);

  const open = (trigger: HTMLAnchorElement) => {
    const src = trigger.dataset.lightboxSrc ?? trigger.href;
    const alt = trigger.dataset.lightboxAlt ?? "";

    previouslyFocused = document.activeElement as HTMLElement | null;
    dialog.image.src = src;
    dialog.image.alt = alt;
    dialog.caption.textContent = alt;
    dialog.caption.hidden = alt.length === 0;
    dialog.element.removeAttribute("hidden");
    document.documentElement.dataset.lightboxOpen = "true";
    dialog.closeButton.focus();
  };

  const close = () => {
    dialog.element.setAttribute("hidden", "");
    dialog.image.removeAttribute("src");
    delete document.documentElement.dataset.lightboxOpen;
    previouslyFocused?.focus();
  };

  const handleTriggerClick = (event: MouseEvent) => {
    const trigger = event.currentTarget;
    if (!(trigger instanceof HTMLAnchorElement)) return;

    event.preventDefault();
    open(trigger);
  };

  const handleDialogClick = (event: MouseEvent) => {
    if (
      event.target === dialog.element ||
      event.target === dialog.closeButton
    ) {
      close();
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (dialog.element.hidden || event.key !== "Escape") return;

    event.preventDefault();
    close();
  };

  for (const trigger of triggers) {
    trigger.addEventListener("click", handleTriggerClick);
  }
  dialog.element.addEventListener("click", handleDialogClick);
  document.addEventListener("keydown", handleKeyDown);

  return () => {
    for (const trigger of triggers) {
      trigger.removeEventListener("click", handleTriggerClick);
    }
    dialog.element.removeEventListener("click", handleDialogClick);
    document.removeEventListener("keydown", handleKeyDown);
    dialog.element.remove();
    delete document.documentElement.dataset.lightboxOpen;
    for (const trigger of wrappedTriggers) unwrapImage(trigger);
  };
}

function wrapImages(
  root: ParentNode,
  triggerClass: string,
): HTMLAnchorElement[] {
  const images = Array.from(
    root.querySelectorAll<HTMLImageElement>("img[src]"),
  );
  const triggers: HTMLAnchorElement[] = [];

  for (const image of images) {
    if (image.closest(`.${triggerClass}`)) continue;
    if (image.closest("a, button")) continue;
    if (image.closest(".rr-lightbox")) continue;

    const src = image.getAttribute("src");
    if (!src) continue;

    image.classList.add("rr-lightbox-image");

    const trigger = document.createElement("a");
    trigger.className = triggerClass;
    trigger.href = src;
    trigger.dataset.lightboxSrc = src;
    trigger.dataset.lightboxAlt = image.alt;
    trigger.setAttribute(
      "aria-label",
      image.alt ? `画像を拡大表示: ${image.alt}` : "画像を拡大表示",
    );

    image.parentNode?.insertBefore(trigger, image);
    trigger.appendChild(image);
    triggers.push(trigger);
  }

  return triggers;
}

function unwrapImage(trigger: HTMLAnchorElement) {
  const image = trigger.querySelector<HTMLImageElement>("img");
  if (!image || !trigger.parentNode) return;

  image.classList.remove("rr-lightbox-image");
  trigger.parentNode.insertBefore(image, trigger);
  trigger.remove();
}
