const focusableSelector =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
let listening = false;

export function initShellDrawers(): void {
  if (!listening) {
    listening = true;
    document.addEventListener("spa:navigation", initShellDrawers);
  }
  for (const drawer of document.querySelectorAll<HTMLElement>(
    "[data-rb-shell-drawer]",
  )) {
    if (drawer.dataset.rbShellDrawerReady === "true") continue;
    drawer.dataset.rbShellDrawerReady = "true";

    const trigger = drawer.querySelector<HTMLButtonElement>(
      "[data-rb-shell-drawer-trigger]",
    );
    const panel = drawer.querySelector<HTMLElement>(
      "[data-rb-shell-drawer-panel]",
    );
    if (!trigger || !panel) continue;

    let returnFocus: HTMLElement | null = null;
    const setOpen = (open: boolean) => {
      drawer.dataset.rbShellDrawerOpen = String(open);
      trigger.setAttribute("aria-expanded", String(open));
      panel.hidden = !open;
      document.documentElement.classList.toggle("rb-shell-drawer-open", open);
      if (!open && returnFocus?.isConnected) returnFocus.focus();
      if (!open) returnFocus = null;
    };

    trigger.addEventListener("click", () => {
      const open = drawer.dataset.rbShellDrawerOpen !== "true";
      if (open) {
        returnFocus = document.activeElement as HTMLElement | null;
        setOpen(true);
        panel.querySelector<HTMLElement>(focusableSelector)?.focus();
      } else {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (drawer.dataset.rbShellDrawerOpen !== "true") return;
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(focusableSelector),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    document.addEventListener("click", (event) => {
      if (
        drawer.dataset.rbShellDrawerOpen === "true" &&
        event.target instanceof Node &&
        !drawer.contains(event.target)
      ) {
        setOpen(false);
      }
    });
    document.addEventListener("spa:navigation", () => setOpen(false));
    panel.addEventListener("click", (event) => {
      if ((event.target as Element | null)?.closest("a[href]")) setOpen(false);
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initShellDrawers, {
    once: true,
  });
} else {
  initShellDrawers();
}
