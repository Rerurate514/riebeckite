import {
  COLOR_MODE_BUTTON_ATTRIBUTE,
  COLOR_MODE_EVENT,
  COLOR_MODE_READY_ATTRIBUTE,
  COLOR_MODE_ROOT_ATTRIBUTE,
  COLOR_MODE_STORAGE_KEY,
  COLOR_MODE_STORAGE_KEY_ATTRIBUTE,
  COLOR_MODES,
  type ColorMode,
} from "./constants.js";

let started = false;

/**
 * Wires up color-mode toggling on the page: applies the persisted mode and
 * delegates clicks from every `ColorModeToggle` root. Safe to call more than
 * once and a no-op when the DOM is already initialized.
 */
export function initColorMode(): void {
  if (started) return;
  started = true;

  const run = () => {
    apply(getCurrentMode(getRoots()));

    document.addEventListener("click", onClick);
    document.addEventListener("spa:navigation", onNavigation);
    window.addEventListener("storage", onStorage);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}

function getRoots(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(`[${COLOR_MODE_ROOT_ATTRIBUTE}]`),
  );
}

function onClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLButtonElement>(
    `[${COLOR_MODE_BUTTON_ATTRIBUTE}]`,
  );
  if (!button) return;
  const root = button.closest<HTMLElement>(`[${COLOR_MODE_ROOT_ATTRIBUTE}]`);
  if (!root) return;
  const mode = parseColorMode(button.getAttribute(COLOR_MODE_BUTTON_ATTRIBUTE));
  if (mode === null) return;
  writeStoredMode(readStorageKey(root), mode);
  apply(mode);
}

function onStorage(event: StorageEvent): void {
  if (event.key === null) return;
  const roots = getRoots();
  if (!roots.some((root) => readStorageKey(root) === event.key)) return;
  apply(getCurrentMode(roots));
}

function onNavigation(): void {
  apply(getCurrentMode(getRoots()));
}

/** Applies a mode to the document and keeps every button in sync. */
function apply(mode: ColorMode): void {
  const element = document.documentElement;
  if (mode === "system") {
    element.removeAttribute("data-rb-mode");
  } else {
    element.setAttribute("data-rb-mode", mode);
  }
  element.setAttribute(COLOR_MODE_READY_ATTRIBUTE, "ready");

  for (const button of document.querySelectorAll<HTMLButtonElement>(
    `[${COLOR_MODE_BUTTON_ATTRIBUTE}]`,
  )) {
    button.setAttribute(
      "aria-pressed",
      button.getAttribute(COLOR_MODE_BUTTON_ATTRIBUTE) === mode
        ? "true"
        : "false",
    );
  }

  document.dispatchEvent(
    new CustomEvent<{ mode: ColorMode }>(COLOR_MODE_EVENT, {
      detail: { mode },
    }),
  );
}

/** Current mode: the first persisted value found, otherwise the SSR baseline. */
function getCurrentMode(roots: readonly HTMLElement[]): ColorMode {
  for (const root of roots) {
    const stored = readStoredMode(readStorageKey(root));
    if (stored !== null) return stored;
  }
  const theme = document.documentElement.getAttribute("data-rb-mode");
  return theme === "light" || theme === "dark" ? theme : "system";
}

function readStorageKey(root: HTMLElement): string {
  return (
    root.getAttribute(COLOR_MODE_STORAGE_KEY_ATTRIBUTE) ??
    COLOR_MODE_STORAGE_KEY
  );
}

function readStoredMode(storageKey: string): ColorMode | null {
  try {
    return parseColorMode(window.localStorage.getItem(storageKey));
  } catch {
    return null;
  }
}

function writeStoredMode(storageKey: string, mode: ColorMode): void {
  try {
    window.localStorage.setItem(storageKey, mode);
  } catch {
    // Storage may be unavailable (private mode, denied permission). The
    // in-memory switch still applies for the current page.
  }
}

function parseColorMode(value: string | null): ColorMode | null {
  return (COLOR_MODES as readonly string[]).includes(value ?? "")
    ? (value as ColorMode)
    : null;
}
