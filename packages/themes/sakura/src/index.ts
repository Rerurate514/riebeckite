import { defineTheme, defineThemeSettings } from "@riebeckite/core";
export const sakuraTheme = defineTheme({
  name: "sakura",
  styles: [{ moduleSpecifier: "@riebeckite/theme-sakura/style.css" }],
  settings: defineThemeSettings({
    bloom: {
      type: "select",
      label: "Bloom",
      default: "soft",
      options: [
        { value: "soft", label: "Soft" },
        { value: "vivid", label: "Vivid" },
      ],
    },
    roundness: {
      type: "select",
      label: "Roundness",
      default: "soft",
      options: [
        { value: "soft", label: "Soft" },
        { value: "crisp", label: "Crisp" },
      ],
    },
    heading: {
      type: "select",
      label: "Headings",
      default: "decorated",
      options: [
        { value: "decorated", label: "Decorated" },
        { value: "plain", label: "Plain" },
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
