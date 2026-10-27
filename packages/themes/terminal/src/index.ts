import { defineTheme, defineThemeSettings } from "@riebeckite/core";

export const terminalTheme = defineTheme({
  name: "terminal",
  styles: [{ moduleSpecifier: "@riebeckite/theme-terminal/style.css" }],
  settings: defineThemeSettings({
    phosphor: {
      type: "select",
      label: "Phosphor",
      default: "green",
      options: [
        { value: "green", label: "Green" },
        { value: "amber", label: "Amber" },
        { value: "white", label: "White" },
        { value: "ice", label: "Ice" },
      ],
    },
    scanlines: { type: "boolean", label: "Scanlines", default: false },
    glow: { type: "boolean", label: "Glow", default: false },
    frameStyle: {
      type: "select",
      label: "Frame style",
      default: "line",
      options: [
        { value: "none", label: "None" },
        { value: "line", label: "Line" },
        { value: "window", label: "Window" },
      ],
    },
    cursor: { type: "boolean", label: "Cursor", default: true },
  }),
  presets: {
    classic: {
      label: "Classic",
      settings: { phosphor: "green", frameStyle: "line", cursor: true },
    },
    amber: {
      label: "Amber",
      settings: { phosphor: "amber", glow: true, frameStyle: "window" },
    },
    modern: {
      label: "Modern",
      settings: { phosphor: "ice", frameStyle: "none", cursor: false },
    },
  },
});
