import { defineTheme, defineThemeSettings } from "@riebeckite/core";

export const signalTheme = defineTheme({
  name: "signal",
  styles: [{ moduleSpecifier: "@riebeckite/theme-signal/style.css" }],
  settings: defineThemeSettings({
    accentColor: {
      type: "color",
      label: "Accent color",
      description: "Graphic accents, links, and markers.",
      default: "#e63b17",
      light: "#e63b17",
      dark: "#ff7554",
    },
    borderWeight: {
      type: "select",
      label: "Border weight",
      default: "bold",
      options: [
        { value: "standard", label: "Standard" },
        { value: "bold", label: "Bold" },
      ],
    },
    typography: {
      type: "select",
      label: "Typography",
      default: "grotesk",
      options: [
        { value: "grotesk", label: "Grotesk" },
        { value: "system", label: "System" },
        { value: "serif", label: "Serif" },
        { value: "mono", label: "Mono" },
      ],
    },
    density: {
      type: "select",
      label: "Density",
      default: "editorial",
      options: [
        { value: "poster", label: "Poster" },
        { value: "editorial", label: "Editorial" },
        { value: "reading", label: "Reading" },
      ],
    },
    fontSize: {
      type: "slider",
      label: "Font size",
      description: "Article text size in rem.",
      default: 1.04,
      min: 0.9375,
      max: 1.25,
      step: 0.0625,
    },
    lineHeight: {
      type: "slider",
      label: "Line height",
      description: "Article line height.",
      default: 1.65,
      min: 1.5,
      max: 2.1,
      step: 0.05,
    },
    markers: {
      type: "boolean",
      label: "Markers",
      description: "Show geometric section markers.",
      default: true,
    },
  }),
  presets: {
    poster: {
      label: "Poster",
      settings: { density: "poster", borderWeight: "bold" },
    },
    editorial: { label: "Editorial", settings: { density: "editorial" } },
    reading: {
      label: "Reading",
      settings: {
        density: "reading",
        typography: "serif",
        borderWeight: "standard",
      },
    },
  },
});
