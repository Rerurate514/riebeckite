import { getFocusable, trapFocus } from "../behaviors/focus.js";
import { lockScroll } from "../behaviors/scroll-lock.js";

export type DialogControllerOptions = {
  readonly triggers?: Iterable<HTMLElement>;
  readonly closeButtons?: Iterable<HTMLElement>;
  readonly initialFocus?: () => HTMLElement | null;
  readonly closeOnBackdrop?: boolean;
  readonly restoreFocus?: boolean;
  readonly onOpen?: () => void;
  readonly onClose?: () => void;
  readonly signal?: AbortSignal;
};

export type DialogController = {
  open: () => void;
  close: () => void;
  readonly isOpen: () => boolean;
  destroy: () => void;
};

const controllers = new WeakMap<HTMLDialogElement, DialogController>();

export function createDialogController(
  dialog: HTMLDialogElement,
  options: DialogControllerOptions = {},
): DialogController {
  const existing = controllers.get(dialog);
  if (existing) return existing;

  const triggers = [...(options.triggers ?? [])];
  const closeButtons = [...(options.closeButtons ?? [])];
  const closeOnBackdrop = options.closeOnBackdrop ?? true;
  let active = false;
  let destroyed = false;
  let returnFocus: HTMLElement | null = null;
  let releaseScroll: (() => void) | null = null;

  const syncTriggers = (open: boolean) => {
    for (const trigger of triggers) {
      trigger.setAttribute("aria-expanded", String(open));
    }
  };

  const finish = () => {
    if (!active) return;
    active = false;
    syncTriggers(false);
    releaseScroll?.();
    releaseScroll = null;

    const target = returnFocus;
    returnFocus = null;
    if (options.restoreFocus !== false && target?.isConnected) target.focus();
    options.onClose?.();
  };

  const open = () => {
    if (destroyed || active || dialog.open) return;

    returnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    active = true;
    dialog.showModal();
    releaseScroll = lockScroll();
    syncTriggers(true);

    const target =
      options.initialFocus?.() ?? getFocusable(dialog)[0] ?? dialog;
    target?.focus();
    options.onOpen?.();
  };

  const close = () => {
    if (dialog.open) {
      dialog.close();
      finish();
    } else {
      finish();
    }
  };

  const onTriggerClick = (event: Event) => {
    event.preventDefault();
    open();
  };
  const onCloseClick = (event: Event) => {
    event.preventDefault();
    close();
  };
  const onDialogClose = () => finish();
  const onDialogKeyDown = (event: KeyboardEvent) => {
    if (!active) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    trapFocus(event, dialog);
  };
  const onDialogClick = (event: MouseEvent) => {
    if (closeOnBackdrop && event.target === dialog) close();
  };

  for (const trigger of triggers) {
    trigger.setAttribute("aria-haspopup", "dialog");
    if (dialog.id) trigger.setAttribute("aria-controls", dialog.id);
    trigger.addEventListener("click", onTriggerClick);
  }
  for (const button of closeButtons) {
    button.addEventListener("click", onCloseClick);
  }
  dialog.addEventListener("close", onDialogClose);
  dialog.addEventListener("click", onDialogClick);
  dialog.addEventListener("keydown", onDialogKeyDown);

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    options.signal?.removeEventListener("abort", destroy);
    for (const trigger of triggers) {
      trigger.removeEventListener("click", onTriggerClick);
    }
    for (const button of closeButtons) {
      button.removeEventListener("click", onCloseClick);
    }
    dialog.removeEventListener("close", onDialogClose);
    dialog.removeEventListener("click", onDialogClick);
    dialog.removeEventListener("keydown", onDialogKeyDown);
    if (dialog.open) dialog.close();
    finish();
    controllers.delete(dialog);
  };

  const controller: DialogController = {
    open,
    close,
    isOpen: () => dialog.open,
    destroy,
  };
  controllers.set(dialog, controller);
  if (options.signal) {
    if (options.signal.aborted) destroy();
    else options.signal.addEventListener("abort", destroy, { once: true });
  }
  return controller;
}
