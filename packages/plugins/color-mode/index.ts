import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";

export { default as ColorModeScript } from "./components/color-mode-script.js";
export { default as ColorModeToggle } from "./components/color-mode-toggle.js";
export {
  COLOR_MODE_BUTTON_ATTRIBUTE,
  COLOR_MODE_EVENT,
  COLOR_MODE_READY_ATTRIBUTE,
  COLOR_MODE_ROOT_ATTRIBUTE,
  COLOR_MODE_STORAGE_KEY,
  COLOR_MODE_STORAGE_KEY_ATTRIBUTE,
  COLOR_MODES,
  type ColorMode,
} from "./src/constants.js";
export { initColorMode } from "./src/init.js";

/**
 * Registers the color-mode plugin: bundles the toggle stylesheet and declares
 * `initColorMode` as the browser entry point that wires up toggling at runtime.
 */
export function colorModePlugin() {
  return definePlugin({
    name: "color-mode",
    assets: [createStyleAsset("color-mode")],
    clientEntries: [createClientEntry("color-mode", "initColorMode")],
  });
}
