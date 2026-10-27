import { defineTheme, defineThemeSettings } from "@riebeckite/core";
export const technicalTheme = defineTheme({
  name: "technical",
  styles: [{ moduleSpecifier: "@riebeckite/theme-technical/style.css" }],
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
