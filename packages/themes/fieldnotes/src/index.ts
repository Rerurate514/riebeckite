import { defineTheme, defineThemeSettings } from "@riebeckite/core";

export const fieldnotesTheme = defineTheme({
  name: "fieldnotes",
  styles: [{ moduleSpecifier: "@riebeckite/theme-fieldnotes/style.css" }],
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
    fontSize: {
      type: "slider",
      label: "Font size",
      description: "Article text size in rem.",
      default: 1.05,
      min: 0.95,
      max: 1.25,
      step: 0.05,
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
    paperStyle: {
      type: "select",
      label: "Paper style",
      default: "ruled",
      options: [
        { value: "plain", label: "Plain" },
        { value: "grid", label: "Grid" },
        { value: "ruled", label: "Ruled" },
        { value: "dotted", label: "Dotted" },
      ],
    },
    inkColor: {
      type: "color",
      label: "Ink color",
      description: "Primary writing and annotation color.",
      default: "#304a62",
      light: "#304a62",
      dark: "#b8d8ed",
    },
    marginRule: { type: "boolean", label: "Margin rule", default: true },
    indexMarks: { type: "boolean", label: "Index marks", default: true },
    texture: { type: "boolean", label: "Paper texture", default: true },
  }),
  presets: {
    journal: {
      label: "Journal",
      settings: { paperStyle: "ruled", marginRule: true },
    },
    laboratory: {
      label: "Laboratory",
      settings: { paperStyle: "grid", indexMarks: true },
    },
    archive: {
      label: "Archive",
      settings: { paperStyle: "plain", texture: false, marginRule: false },
    },
  },
});
