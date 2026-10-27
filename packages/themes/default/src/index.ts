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
      ],
    },
  }),
});
