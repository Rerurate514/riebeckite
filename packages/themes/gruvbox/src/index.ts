import { defineTheme, defineThemeSettings } from "@riebeckite/core";
export const gruvboxTheme = defineTheme({
  name: "gruvbox",
  styles: [{ moduleSpecifier: "@riebeckite/theme-gruvbox/style.css" }],
  settings: defineThemeSettings({
    contrast: {
      type: "select",
      label: "Contrast",
      default: "medium",
      options: [
        { value: "soft", label: "Soft" },
        { value: "medium", label: "Medium" },
        { value: "hard", label: "Hard" },
      ],
    },
    typography: {
      type: "select",
      label: "Typography",
      default: "system",
      options: [
        { value: "system", label: "System" },
        { value: "serif", label: "Serif" },
        { value: "sans", label: "Sans" },
      ],
    },
    accentColor: {
      type: "color",
      label: "Accent color",
      description: "Links, rules, and interactive accents.",
      default: "#076678",
      light: "#076678",
      dark: "#83a598",
    },
    articleWidth: {
      type: "slider",
      label: "Article width",
      description: "Maximum article width in rem.",
      default: 48,
      min: 36,
      max: 64,
      step: 1,
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
    scanlines: {
      type: "boolean",
      label: "Scanlines",
      description: "Overlay a subtle CRT scanline pattern on the page.",
      default: false,
    },
    flourish: {
      type: "boolean",
      label: "Flourish",
      description: "Show a subtle SVG flourish in the article header.",
      default: false,
    },
  }),
  presets: { reading: { label: "Reading", settings: { typography: "serif" } } },
});
