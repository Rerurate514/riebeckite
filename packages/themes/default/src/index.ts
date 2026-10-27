import { defineTheme, defineThemeSettings } from "@riebeckite/core";

export const defaultTheme = defineTheme({
  name: "riebeckite",
  styles: [{ moduleSpecifier: "@riebeckite/theme-default/style.css" }],
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
      description: "Interactive accents for controls and reading markers.",
      default: "#075fc9",
      light: "#075fc9",
      dark: "#62aaff",
    },
    articleWidth: {
      type: "slider",
      label: "Article width",
      description: "Maximum article width in rem.",
      default: 46,
      min: 36,
      max: 56,
      step: 1,
    },
  }),
  presets: {
    reading: {
      label: "Reading",
      settings: { typography: "serif", articleWidth: 44 },
    },
  },
});
