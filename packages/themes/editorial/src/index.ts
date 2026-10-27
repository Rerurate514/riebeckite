import { defineTheme, defineThemeSettings } from "@riebeckite/core";
export const editorialTheme = defineTheme({
  name: "editorial",
  styles: [{ moduleSpecifier: "@riebeckite/theme-editorial/style.css" }],
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
      default: "#8a2738",
      light: "#8a2738",
      dark: "#eb9da9",
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
      default: 1.9,
      min: 1.5,
      max: 2.1,
      step: 0.05,
    },
    motion: { type: "boolean", label: "Motion", default: true },
    dropCap: {
      type: "boolean",
      label: "Drop cap",
      description: "Enlarge the first letter of the article.",
      default: false,
    },
    ornament: {
      type: "boolean",
      label: "Ornament",
      description: "Show the editorial ornament in the article header.",
      default: true,
    },
  }),
  presets: { reading: { label: "Reading", settings: { typography: "serif" } } },
});
