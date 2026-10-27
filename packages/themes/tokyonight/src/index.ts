import { defineTheme, defineThemeSettings } from "@riebeckite/core";
export const tokyonightTheme = defineTheme({
  name: "tokyonight",
  styles: [{ moduleSpecifier: "@riebeckite/theme-tokyonight/style.css" }],
  settings: defineThemeSettings({
    density: {
      type: "select",
      label: "Density",
      default: "cozy",
      options: [
        { value: "cozy", label: "Cozy" },
        { value: "compact", label: "Compact" },
      ],
    },
    heading: {
      type: "select",
      label: "Headings",
      default: "tech",
      options: [
        { value: "tech", label: "Tech" },
        { value: "plain", label: "Plain" },
      ],
    },
    neon: { type: "boolean", label: "Neon", default: false },
    typography: {
      type: "select",
      label: "Typography",
      default: "system",
      options: [
        { value: "system", label: "System" },
        { value: "serif", label: "Serif" },
        { value: "sans", label: "Sans" },
        { value: "mono", label: "Mono" },
      ],
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
    fontSize: {
      type: "slider",
      label: "Font size",
      description: "Article text size in rem.",
      default: 1,
      min: 0.9375,
      max: 1.25,
      step: 0.0625,
    },
    lineHeight: {
      type: "slider",
      label: "Line height",
      description: "Article line height.",
      default: 1.7,
      min: 1.5,
      max: 2.1,
      step: 0.05,
    },
    aurora: {
      type: "boolean",
      label: "Aurora",
      description: "Animate a neon aurora line under the article header.",
      default: false,
    },
  }),
  presets: { reading: { label: "Reading", settings: { typography: "serif" } } },
});
