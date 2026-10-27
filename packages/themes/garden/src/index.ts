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
  }),
  presets: { reading: { label: "Reading", settings: { typography: "serif" } } },
});
