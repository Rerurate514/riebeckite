import { defineTheme, defineThemeSettings } from "@riebeckite/core";

export const fieldnotesTheme = defineTheme({
  name: "fieldnotes",
  styles: [{ moduleSpecifier: "@riebeckite/theme-fieldnotes/style.css" }],
  settings: defineThemeSettings({
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
