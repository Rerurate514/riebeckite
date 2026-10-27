import { defineTheme, defineThemeSettings } from "@riebeckite/core";
export const gardenTheme = defineTheme({
  name: "garden",
  styles: [{ moduleSpecifier: "@riebeckite/theme-garden/style.css" }],
  settings: defineThemeSettings({
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
      description: "Rules and interactive accents.",
      default: "#526b38",
      light: "#526b38",
      dark: "#afc77c",
    },
    articleWidth: {
      type: "slider",
      label: "Article width",
      description: "Maximum article width in rem.",
      default: 46,
      min: 34,
      max: 60,
      step: 1,
    },
    lineHeight: {
      type: "slider",
      label: "Line height",
      description: "Article line height.",
      default: 1.9,
      min: 1.5,
      max: 2.1,
      step: 0.05,
    },
    motion: { type: "boolean", label: "Motion", default: true },
    season: {
      type: "select",
      label: "Season",
      description: "Tint the decorative sprigs with a seasonal palette.",
      default: "spring",
      options: [
        { value: "spring", label: "Spring" },
        { value: "summer", label: "Summer" },
        { value: "autumn", label: "Autumn" },
        { value: "winter", label: "Winter" },
      ],
    },
  }),
  presets: { reading: { label: "Reading", settings: { typography: "serif" } } },
});
