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
    aurora: {
      type: "boolean",
      label: "Aurora",
      description: "Animate a neon aurora line under the article header.",
      default: false,
    },
  }),
  presets: { reading: { label: "Reading", settings: { typography: "serif" } } },
});
