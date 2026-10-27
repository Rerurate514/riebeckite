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
      description:
        "Scatter a low-contrast starfield across the article header.",
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
        { value: "mono", label: "Mono" },
      ],
    },
    fontSize: {
      type: "slider",
      label: "Font size",
      description: "Article text size in rem.",
      default: 1,
      min: 0.9375,
      max: 1.25,
      step: 0.0625,
    },
    lineHeight: {
      type: "slider",
      label: "Line height",
      description: "Article line height.",
      default: 1.75,
      min: 1.5,
      max: 2.1,
      step: 0.05,
    },
  }),
  presets: { reading: { label: "Reading", settings: { typography: "serif" } } },
});
