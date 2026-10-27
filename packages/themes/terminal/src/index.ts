import { defineTheme, defineThemeSettings } from "@riebeckite/core";

export const terminalTheme = defineTheme({
  name: "terminal",
  styles: [{ moduleSpecifier: "@riebeckite/theme-terminal/style.css" }],
  settings: defineThemeSettings({
    typography: {
      type: "select",
      label: "Typography",
      default: "mono",
      options: [
        { value: "mono", label: "Mono" },
        { value: "system", label: "System" },
        { value: "serif", label: "Serif" },
        { value: "sans", label: "Sans" },
      ],
    },
    fontSize: {
      type: "slider",
      label: "Font size",
      description: "Article text size in rem.",
      default: 0.95,
      min: 0.875,
      max: 1.25,
      step: 0.0625,
    },
    lineHeight: {
      type: "slider",
      label: "Line height",
      description: "Article line height.",
      default: 1.75,
      min: 1.5,
      max: 2.1,
      step: 0.05,
    },
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
