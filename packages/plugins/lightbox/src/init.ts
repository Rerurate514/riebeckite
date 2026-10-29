import { createDialogController } from "@riebeckite/ui/dialog";
import { createDialog } from "./dialog.js";
import {
  DEFAULT_CLOSE_LABEL,
  DEFAULT_EXPAND_LABEL,
  DEFAULT_TRIGGER_CLASS,
  type LightboxInitOptions,
} from "./types.js";

export function initLightbox(
  root: ParentNode = document,
  options: LightboxInitOptions = {},
): () => void {
  const triggerClass = options.selectorClass ?? DEFAULT_TRIGGER_CLASS;
  const expandLabel = options.expandLabel ?? DEFAULT_EXPAND_LABEL;
  const closeLabel = options.closeLabel ?? DEFAULT_CLOSE_LABEL;
  const wrappedTriggers =
    options.autoWrapImages === false
      ? []
      : wrapImages(root, triggerClass, expandLabel);
  const triggers = Array.from(
    root.querySelectorAll<HTMLAnchorElement>(`.${triggerClass}`),
  );
  if (triggers.length === 0) {
    return () => {
      for (const trigger of wrappedTriggers) unwrapImage(trigger);
    };
  }

  const dialog = createDialog({ expandLabel, closeLabel });
  document.body.appendChild(dialog.element);

  const controller = createDialogController(dialog.element, {
    closeButtons: [dialog.closeButton],
    initialFocus: () => dialog.closeButton,
    onClose: () => {
      dialog.image.removeAttribute("src");
    },
  });

  const open = (trigger: HTMLAnchorElement) => {
    const src = trigger.dataset.lightboxSrc ?? trigger.href;
    const alt = trigger.dataset.lightboxAlt ?? "";

    dialog.image.src = src;
    dialog.image.alt = alt;
    dialog.caption.textContent = alt;
    dialog.caption.hidden = alt.length === 0;
    controller.open();
  };

  const handleTriggerClick = (event: MouseEvent) => {
    const trigger = event.currentTarget;
    if (!(trigger instanceof HTMLAnchorElement)) return;

    event.preventDefault();
    open(trigger);
  };

  for (const trigger of triggers) {
    trigger.addEventListener("click", handleTriggerClick);
  }

  return () => {
    for (const trigger of triggers) {
      trigger.removeEventListener("click", handleTriggerClick);
    }
    controller.destroy();
    dialog.element.remove();
    for (const trigger of wrappedTriggers) unwrapImage(trigger);
  };
}

function wrapImages(
  root: ParentNode,
  triggerClass: string,
  expandLabel: string,
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
      image.alt ? `${expandLabel}: ${image.alt}` : expandLabel,
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
