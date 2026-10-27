import { defineTheme, defineThemeSettings } from "@riebeckite/core";
export const editorialTheme = defineTheme({
  name: "editorial",
  styles: [{ moduleSpecifier: "@riebeckite/theme-editorial/style.css" }],
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
