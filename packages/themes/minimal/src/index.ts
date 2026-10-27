import { defineTheme, defineThemeSettings } from "@riebeckite/core";
export const minimalTheme = defineTheme({
  name: "minimal",
  styles: [{ moduleSpecifier: "@riebeckite/theme-minimal/style.css" }],
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
