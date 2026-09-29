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
 * binds every `ColorModeToggle` root. Safe to call more than once and a no-op
 * when the DOM is already initialized.
 */
export function initColorMode(): void {
  if (started) return;
  started = true;

  const run = () => {
    const roots = Array.from(
      document.querySelectorAll<HTMLElement>(`[${COLOR_MODE_ROOT_ATTRIBUTE}]`),
    );

    apply(getCurrentMode(roots));

    if (roots.length === 0) return;

    for (const root of roots) {
      const storageKey = readStorageKey(root);
      for (const button of root.querySelectorAll<HTMLButtonElement>(
        `[${COLOR_MODE_BUTTON_ATTRIBUTE}]`,
      )) {
        button.addEventListener("click", () => {
          const mode = parseColorMode(
            button.getAttribute(COLOR_MODE_BUTTON_ATTRIBUTE),
          );
          if (mode === null) return;
          writeStoredMode(storageKey, mode);
          apply(mode);
        });
      }
    }

    const storageKeys = new Set(roots.map(readStorageKey));
    window.addEventListener("storage", (event) => {
      if (event.key !== null && storageKeys.has(event.key)) {
        apply(getCurrentMode(roots));
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}

/** Applies a mode to the document and keeps every button in sync. */
function apply(mode: ColorMode): void {
  const element = document.documentElement;
  if (mode === "system") {
    element.removeAttribute("data-theme");
  } else {
    element.setAttribute("data-theme", mode);
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
  const theme = document.documentElement.getAttribute("data-theme");
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
