import { defineTheme, defineThemeSettings } from "@riebeckite/core";

export const moduleTheme = defineTheme({
  name: "module",
  styles: [{ moduleSpecifier: "@riebeckite/theme-module/style.css" }],
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
      label: "Edge light",
      description: "Warm accent for controls and structural details.",
      default: "#a94e08",
      light: "#a94e08",
      dark: "#ff9d4d",
    },
    articleWidth: {
      type: "slider",
      label: "Article width",
      description: "Maximum article width in rem.",
      default: 50,
      min: 40,
      max: 68,
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
    blueprint: {
      type: "boolean",
      label: "Blueprint grid",
      description: "Show the calibrated grid behind the reading surface.",
      default: true,
    },
    glow: {
      type: "boolean",
      label: "Edge glow",
      description: "Illuminate the article frame with the accent color.",
      default: true,
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
