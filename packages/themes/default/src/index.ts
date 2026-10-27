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
        { value: "mono", label: "Mono" },
      ],
    },
    accentColor: {
      type: "color",
      label: "Accent color",
      description: "Interactive accents for controls.",
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
    fontSize: {
      type: "slider",
      label: "Font size",
      description: "Article text size in rem.",
      default: 1.0625,
      min: 0.9375,
      max: 1.25,
      step: 0.0625,
    },
    lineHeight: {
      type: "slider",
      label: "Line height",
      description: "Article line height.",
      default: 1.8,
      min: 1.5,
      max: 2.1,
      step: 0.05,
    },
  }),
  presets: {
    reading: {
      label: "Reading",
      settings: { typography: "serif", articleWidth: 44 },
    },
  },
});
