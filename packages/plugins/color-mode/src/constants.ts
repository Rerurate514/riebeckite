/** The modes a site can be in. */
export const COLOR_MODES = ["light", "dark", "system"] as const;

export type ColorMode = (typeof COLOR_MODES)[number];

/** Default `localStorage` key used to persist the selected mode. */
export const COLOR_MODE_STORAGE_KEY = "riebeckite-color-mode";

/** Attribute on the root element rendered by `ColorModeToggle`. */
export const COLOR_MODE_ROOT_ATTRIBUTE = "data-color-mode-root";

/** Per-root override for the storage key. */
export const COLOR_MODE_STORAGE_KEY_ATTRIBUTE = "data-color-mode-storage-key";

/** Attribute on each mode button. */
export const COLOR_MODE_BUTTON_ATTRIBUTE = "data-color-mode";

/**
 * Attribute set on `<html>` once the runtime is ready. The stylesheet keeps
 * the toggle hidden until this is present, so pages with JavaScript disabled
 * never show a non-functional control.
 */
export const COLOR_MODE_READY_ATTRIBUTE = "data-rb-color-mode";

/**
 * `CustomEvent` dispatched on `document` whenever the mode changes, with
 * `{ detail: { mode } }`. Present for integrations (for example, re-rendering
 * diagrams that read `data-theme`); nothing consumes it today.
 */
export const COLOR_MODE_EVENT = "riebeckite:color-mode";
