type ClientContext = { root?: ParentNode };

export function initShellDrawer(context: ClientContext = {}): () => void {
  const root = context.root ?? document;
  const cleanups = new Map<HTMLElement, () => void>();
  const initialize = () => {
    root
      .querySelectorAll<HTMLElement>("[data-rb-shell-drawer]")
      .forEach((drawer) => {
        if (!cleanups.has(drawer)) cleanups.set(drawer, init(drawer));
      });
    for (const [drawer, cleanup] of cleanups) {
      if (!drawer.isConnected) {
        cleanup();
        cleanups.delete(drawer);
      }
    }
  };

  initialize();
  const observer = new MutationObserver(initialize);
  observer.observe(root, { childList: true, subtree: true });
  return () => {
    observer.disconnect();
    for (const cleanup of cleanups.values()) cleanup();
    cleanups.clear();
  };
}

function init(drawer: HTMLElement): () => void {
  const trigger = drawer.querySelector<HTMLButtonElement>(
    "[data-rb-shell-drawer-open]",
  );
  const dialog = drawer.querySelector<HTMLDialogElement>(
    "[data-rb-shell-drawer-dialog]",
  );
  const close = drawer.querySelector<HTMLButtonElement>(
    "[data-rb-shell-drawer-close]",
  );
  if (!trigger || !dialog || !close) return () => {};

  let previousFocus: HTMLElement | null = null;
  const restore = () => {
    document.documentElement.classList.remove("rb-shell-drawer-open");
    trigger.setAttribute("aria-expanded", "false");
    if (previousFocus?.isConnected) previousFocus.focus();
    previousFocus = null;
  };
  const open = () => {
    previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (!dialog.open) dialog.showModal();
    document.documentElement.classList.add("rb-shell-drawer-open");
    trigger.setAttribute("aria-expanded", "true");
    close.focus();
  };
  const closeDialog = () => {
    if (dialog.open) dialog.close();
  };
  const closeOnNavigation = (event: Event) => {
    if (event.target instanceof Element && event.target.closest("a[href]"))
      closeDialog();
  };

  trigger.addEventListener("click", open);
  close.addEventListener("click", closeDialog);
  dialog.addEventListener("close", restore);
  dialog.addEventListener("click", closeOnNavigation);
  window.addEventListener("popstate", closeDialog);
  return () => {
    trigger.removeEventListener("click", open);
    close.removeEventListener("click", closeDialog);
    dialog.removeEventListener("close", restore);
    dialog.removeEventListener("click", closeOnNavigation);
    window.removeEventListener("popstate", closeDialog);
    if (dialog.open) dialog.close();
  };
}
