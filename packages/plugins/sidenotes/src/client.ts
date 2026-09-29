/**
 * Mobile popover behavior for `@riebeckite/plugin-sidenotes`.
 *
 * Desktop margin notes are static and need no JavaScript: this entry ignores
 * the page whenever `(min-width: 48rem)` matches and disconnects itself when
 * the viewport crosses into the desktop layout.
 */

/** Public options exposed to the browser through the plugin's client entry. */
export type SidenotesClientOptions = {
  /** Selector for reference links. Defaults to `[data-rr-sidenotes-ref]`. */
  selector?: string;
  /** Accessible label prefix for a reference link while its popover is closed. */
  openLabel?: string;
  /** Accessible label prefix for a reference link while its popover is open. */
  closeLabel?: string;
};

const DEFAULT_SELECTOR = "[data-rr-sidenotes-ref]";
const NOTE_OPEN_CLASS = "rr-sidenotes__note--open";
const DESKTOP_QUERY = "(min-width: 48rem)";

const DEFAULT_OPEN_LABEL = "Footnote";
const DEFAULT_CLOSE_LABEL = "Close sidenote";

export function initSidenotes(options: SidenotesClientOptions = {}) {
  const desktopQuery = window.matchMedia(DESKTOP_QUERY);
  // Desktop margin notes are always visible; no popover behavior is needed.
  if (desktopQuery.matches) return;

  const toggles = Array.from(
    document.querySelectorAll<HTMLAnchorElement>(
      options.selector ?? DEFAULT_SELECTOR,
    ),
  );
  if (toggles.length === 0) return;

  const openLabel = options.openLabel ?? DEFAULT_OPEN_LABEL;
  const closeLabel = options.closeLabel ?? DEFAULT_CLOSE_LABEL;

  const noteFor = (toggle: HTMLAnchorElement): HTMLElement | null => {
    const controls = toggle.getAttribute("aria-controls");
    if (!controls) return null;
    const note = document.getElementById(controls);
    return note instanceof HTMLElement ? note : null;
  };

  const isInsideSidenotes = (target: Node | null): boolean => {
    if (!target) return false;
    for (const toggle of toggles) {
      const note = noteFor(toggle);
      if (toggle.contains(target) || note?.contains(target)) return true;
    }
    return false;
  };

  const setOpen = (
    toggle: HTMLAnchorElement,
    note: HTMLElement,
    open: boolean,
  ) => {
    const index = toggle.textContent?.trim() ?? "";
    const label = open
      ? `${closeLabel} ${index}`.trim()
      : `${openLabel} ${index}`.trim();
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", label);
    note.classList.toggle(NOTE_OPEN_CLASS, open);
    if (open) note.focus({ preventScroll: true });
  };

  const closeAll = () => {
    for (const toggle of toggles) {
      const note = noteFor(toggle);
      if (note?.classList.contains(NOTE_OPEN_CLASS)) {
        setOpen(toggle, note, false);
      }
    }
  };

  for (const toggle of toggles) {
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      const note = noteFor(toggle);
      if (!note) return;
      const isOpen = note.classList.contains(NOTE_OPEN_CLASS);
      if (!isOpen) closeAll();
      setOpen(toggle, note, !isOpen);
    });
  }

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    closeAll();
  };

  const onClickOutside = (event: MouseEvent) => {
    if (isInsideSidenotes(event.target instanceof Node ? event.target : null)) {
      return;
    }
    closeAll();
  };

  document.addEventListener("keydown", onKeydown);
  document.addEventListener("click", onClickOutside);

  const onViewportChange = (event: MediaQueryListEvent) => {
    if (!event.matches) return;
    closeAll();
    document.removeEventListener("keydown", onKeydown);
    document.removeEventListener("click", onClickOutside);
    desktopQuery.removeEventListener("change", onViewportChange);
  };
  desktopQuery.addEventListener("change", onViewportChange);
}
