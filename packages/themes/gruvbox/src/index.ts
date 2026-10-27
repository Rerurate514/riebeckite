import { defineTheme, defineThemeSettings } from "@riebeckite/core";
export const gruvboxTheme = defineTheme({
  name: "gruvbox",
  styles: [{ moduleSpecifier: "@riebeckite/theme-gruvbox/style.css" }],
  settings: defineThemeSettings({
    contrast: {
      type: "select",
      label: "Contrast",
      default: "medium",
      options: [
        { value: "soft", label: "Soft" },
        { value: "medium", label: "Medium" },
        { value: "hard", label: "Hard" },
      ],
    },
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
  }),
  presets: { reading: { label: "Reading", settings: { typography: "serif" } } },
});
