import { defineTheme, defineThemeSettings } from "@riebeckite/core";
export const rerurateTheme = defineTheme({
  name: "rerurate",
  styles: [{ moduleSpecifier: "@riebeckite/theme-rerurate/style.css" }],
  settings: defineThemeSettings({
    initial: {
      type: "select",
      label: "Initial",
      default: "off",
      options: [
        { value: "off", label: "Off" },
        { value: "small", label: "Small" },
        { value: "medium", label: "Medium" },
        { value: "large", label: "Large" },
      ],
    },
    largeHeadings: { type: "boolean", label: "Large headings", default: false },
    headingMarks: { type: "boolean", label: "Heading marks", default: true },
    motion: { type: "boolean", label: "Motion", default: true },
    stars: {
      type: "boolean",
      label: "Stars",
      description: "Scatter a low-contrast starfield across the article header.",
      default: false,
    },
    constellation: {
      type: "boolean",
      label: "Constellation",
      description: "Connect the header stars into a thin constellation.",
      default: false,
    },
    orbit: {
      type: "boolean",
      label: "Orbit",
      description: "Draw a faint orbital ring around the article header.",
      default: false,
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
